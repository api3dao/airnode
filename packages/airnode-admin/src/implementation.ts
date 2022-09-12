import * as airnodeAbi from '@api3/airnode-abi';
import { AirnodeRrpV0, RequesterAuthorizerWithAirnode, PROTOCOL_IDS } from '@api3/airnode-protocol';
import { fetchProviderRecommendedEip1559GasPrice, fetchProviderRecommendedGasPrice } from '@api3/airnode-utilities';
import { ethers } from 'ethers';
import { Arguments } from 'yargs';
import { config } from '@api3/airnode-validator';

const assertAllParamsAreReturned = (params: object, ethersParams: any[]) => {
  if (Object.keys(params).length !== ethersParams.length) {
    throw new Error(`SDK doesn't return some of the parameters!`);
  }
};

/**
 * Parses Ethers transaction override options from CLI arguments.
 * @param args The yargs inferred CLI arguments object
 * @returns The parsed overrides object with values compatible with Ethers
 */
export const parseCliOverrides = (args: Arguments): ethers.Overrides => {
  const overrideMap = [
    { name: 'gas-limit', key: 'gasLimit', parseValue: (value: string) => ethers.BigNumber.from(value) },
    { name: 'gas-price', key: 'gasPrice', parseValue: (value: string) => ethers.utils.parseUnits(value, 'gwei') },
    { name: 'max-fee', key: 'maxFeePerGas', parseValue: (value: string) => ethers.utils.parseUnits(value, 'gwei') },
    {
      name: 'max-priority-fee',
      key: 'maxPriorityFeePerGas',
      parseValue: (value: string) => ethers.utils.parseUnits(value, 'gwei'),
    },
    { name: 'nonce', key: 'nonce', parseValue: parseInt },
  ];

  const overrides: ethers.Overrides = overrideMap.reduce((acc, override) => {
    if (args[override.name]) return { ...acc, [override.key]: override.parseValue(args[override.name] as string) };
    return acc;
  }, {});

  return overrides;
};

/**
 * Parses Ethers transaction override options and sets them based on the transaction type supported by the network and user inputs.
 * @param provider Ethers provider
 * @param overrides Overrides object passed into the function
 * @returns The parsed overrides object with values compatible with Ethers
 */
export const parseOverrides = async (
  provider: ethers.providers.Provider,
  overrides: ethers.Overrides = {}
): Promise<ethers.Overrides> => {
  const { gasPrice, maxFeePerGas, maxPriorityFeePerGas } = overrides;

  const feeData = await provider.getFeeData();
  const supportsEip1559 = !!(feeData.maxFeePerGas && feeData.maxPriorityFeePerGas);
  const hasEip1559Overrides = !!(maxFeePerGas || maxPriorityFeePerGas);
  const hasLegacyOverrides = !!gasPrice;

  // Mixed overrides
  if (hasLegacyOverrides && hasEip1559Overrides) {
    throw new Error('Both legacy and EIP1559 override pricing options specified - ambiguous');
  }
  // Chain does not support EIP1559 but EIP1559 overrides provided
  if (!supportsEip1559 && hasEip1559Overrides) {
    throw new Error('EIP1559 override pricing specified on legacy network');
  }

  // EIP1559 network and no EIP1559 overrides or legacy overrides
  if (supportsEip1559 && !hasEip1559Overrides && !hasLegacyOverrides) {
    const gasTarget = await fetchProviderRecommendedEip1559GasPrice(
      provider,
      {
        gasPriceStrategy: 'providerRecommendedEip1559GasPrice',
        baseFeeMultiplier: 2,
        priorityFee: {
          value: 3.12,
          unit: 'gwei',
        },
      },
      Date.now()
    );

    return {
      ...overrides,
      ...gasTarget,
    };
  }

  // Legacy network and no legacy overrides
  if (!supportsEip1559 && !hasLegacyOverrides) {
    const gasTarget = await fetchProviderRecommendedGasPrice(
      provider,
      {
        gasPriceStrategy: 'providerRecommendedGasPrice',
        recommendedGasPriceMultiplier: 1,
      },
      Date.now()
    );

    return {
      ...overrides,
      ...gasTarget,
    };
  }

  // User specified overrides
  return overrides;
};

/**
 * HD wallets allow us to create multiple accounts from a single mnemonic.
 * Each sponsor creates a designated wallet for each provider to use
 * in order for them to be able to respond to the requests their requesters make.
 *
 * By convention derivation paths start with a master index
 * followed by child indexes that can be any integer up to 2^31.
 *
 * Since addresses can be represented as 160bits (20bytes) we can then
 * split it in chunks of 31bits and create a path with the following pattern:
 * 1/1st31bits/2nd31bits/3rd31bits/4th31bits/5th31bits/6th31bits.
 *
 * @param sponsorAddress A string representing a 20bytes hex address
 * @returns The path derived from the address
 */
export const deriveWalletPathFromSponsorAddress = (sponsorAddress: string): string => {
  const sponsorAddressBN = ethers.BigNumber.from(ethers.utils.getAddress(sponsorAddress));
  const paths = [];
  for (let i = 0; i < 6; i++) {
    const shiftedSponsorAddressBN = sponsorAddressBN.shr(31 * i);
    paths.push(shiftedSponsorAddressBN.mask(31).toString());
  }
  return `${PROTOCOL_IDS.RRP}/${paths.join('/')}`;
};

export const deriveAirnodeXpub = (airnodeMnemonic: string): string => {
  const airnodeHdNode = ethers.utils.HDNode.fromMnemonic(airnodeMnemonic).derivePath("m/44'/60'/0'");
  return airnodeHdNode.neuter().extendedKey;
};

export const verifyAirnodeXpub = (airnodeXpub: string, airnodeAddress: string): ethers.utils.HDNode => {
  // The xpub is expected to belong to the hardened path m/44'/60'/0'
  // so we must derive the child default derivation path m/44'/60'/0'/0/0
  // to compare it and check if xpub belongs to the Airnode wallet
  const hdNode = ethers.utils.HDNode.fromExtendedKey(airnodeXpub);
  if (airnodeAddress !== hdNode.derivePath('0/0').address) {
    throw new Error(`xpub does not belong to Airnode: ${airnodeAddress}`);
  }
  return hdNode;
};

export function deriveSponsorWalletAddress(airnodeXpub: string, airnodeAddress: string, sponsorAddress: string) {
  const hdNode = verifyAirnodeXpub(airnodeXpub, airnodeAddress);
  const derivationPath = deriveWalletPathFromSponsorAddress(sponsorAddress);
  return hdNode.derivePath(derivationPath).address;
}

export async function sponsorRequester(
  airnodeRrp: AirnodeRrpV0,
  requesterAddress: string,
  overrides?: ethers.Overrides
) {
  await airnodeRrp.setSponsorshipStatus(requesterAddress, true, await parseOverrides(airnodeRrp.provider, overrides));
  return requesterAddress;
}

export async function unsponsorRequester(
  airnodeRrp: AirnodeRrpV0,
  requesterAddress: string,
  overrides?: ethers.Overrides
) {
  await airnodeRrp.setSponsorshipStatus(requesterAddress, false, await parseOverrides(airnodeRrp.provider, overrides));
  return requesterAddress;
}

export interface TemplateFile {
  parameters: string | airnodeAbi.InputParameter[];
  airnode: string;
  endpointId: string;
}

export async function createTemplate(airnodeRrp: AirnodeRrpV0, template: TemplateFile, overrides?: ethers.Overrides) {
  let encodedParameters;
  if (typeof template.parameters == 'string') {
    encodedParameters = template.parameters;
  } else {
    encodedParameters = airnodeAbi.encode(template.parameters);
  }
  const tx = await airnodeRrp.createTemplate(
    template.airnode,
    template.endpointId,
    encodedParameters,
    await parseOverrides(airnodeRrp.provider, overrides)
  );

  return new Promise<string>((resolve) =>
    airnodeRrp.provider.once(tx.hash, ({ logs }) => {
      const parsedLog = airnodeRrp.interface.parseLog(logs[0]);
      resolve(parsedLog.args.templateId);
    })
  );
}

export function createInlineTemplate(template: TemplateFile): config.Template {
  const { airnode, parameters, endpointId } = template;

  let encodedParameters;
  if (typeof parameters == 'string') {
    encodedParameters = parameters;
  } else {
    encodedParameters = airnodeAbi.encode(parameters);
  }

  const templateId = ethers.utils.solidityKeccak256(
    ['address', 'bytes32', 'bytes'],
    [airnode, endpointId, encodedParameters]
  );

  return { templateId, endpointId, encodedParameters };
}

export async function requestWithdrawal(
  airnodeRrp: AirnodeRrpV0,
  airnodeAddress: string,
  sponsorWalletAddress: string,
  overrides?: ethers.Overrides
) {
  const tx = await airnodeRrp.requestWithdrawal(
    airnodeAddress,
    sponsorWalletAddress,
    await parseOverrides(airnodeRrp.provider, overrides)
  );

  return new Promise<string>((resolve) =>
    airnodeRrp.provider.once(tx.hash, ({ logs }) => {
      const parsedLog = airnodeRrp.interface.parseLog(logs[0]);
      resolve(parsedLog.args.withdrawalRequestId);
    })
  );
}

export async function checkWithdrawalRequest(airnodeRrp: AirnodeRrpV0, requestId: string) {
  const filter = airnodeRrp.filters.FulfilledWithdrawal(null, null, requestId, null, null);

  const logs = await airnodeRrp.queryFilter(filter);
  if (logs.length === 0) {
    return undefined;
  }

  const ethersLogParams = logs[0].args;
  // remove array parameters from ethers response
  const { airnode, sponsor, withdrawalRequestId, sponsorWallet, amount } = ethersLogParams;
  const logParams = { airnode, sponsor, withdrawalRequestId, sponsorWallet, amount };
  assertAllParamsAreReturned(logParams, ethersLogParams);

  // cast ethers BigNumber for portability
  return { ...logParams, amount: amount.toString() };
}

export function deriveEndpointId(oisTitle: string, endpointName: string) {
  return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string', 'string'], [oisTitle, endpointName]));
}

export async function requesterToRequestCountPlusOne(
  airnodeRrp: AirnodeRrpV0,
  requesterAddress: string,
  overrides?: ethers.Overrides
) {
  return (
    await airnodeRrp.requesterToRequestCountPlusOne(
      requesterAddress,
      await parseOverrides(airnodeRrp.provider, overrides)
    )
  ).toString();
}

export async function getTemplate(airnodeRrp: AirnodeRrpV0, templateId: string) {
  const ethersTemplate = await airnodeRrp.getTemplates([templateId]);

  // remove array parameters from ethers response
  const {
    airnodes: [airnode],
    endpointIds: [endpointId],
    parameters: [parameters],
  } = ethersTemplate;
  const template = { airnode, endpointId, parameters };
  assertAllParamsAreReturned(template, ethersTemplate);

  return template;
}

export async function getTemplates(airnodeRrp: AirnodeRrpV0, templateIds: string[]) {
  const ethersTemplate = await airnodeRrp.getTemplates(templateIds);

  // remove array parameters from ethers response
  const { airnodes, endpointIds, parameters } = ethersTemplate;
  const templates = { airnodes, endpointIds, parameters };
  assertAllParamsAreReturned(templates, ethersTemplate);

  const formattedTemplates = airnodes.map((_, i) => ({
    airnode: airnodes[i],
    endpointId: endpointIds[i],
    parameters: parameters[i],
  }));
  return formattedTemplates;
}

export function sponsorToRequesterToSponsorshipStatus(
  airnodeRrp: AirnodeRrpV0,
  sponsorAddress: string,
  requesterAddress: string
) {
  return airnodeRrp.sponsorToRequesterToSponsorshipStatus(sponsorAddress, requesterAddress);
}

export async function sponsorToWithdrawalRequestCount(airnodeRrp: AirnodeRrpV0, sponsorAddress: string) {
  const requestsCount = await airnodeRrp.sponsorToWithdrawalRequestCount(sponsorAddress);
  return requestsCount.toString();
}

export interface FulfillWithdrawalReturnValue {
  airnode: string;
  sponsor: string;
  withdrawalRequestId: string;
  sponsorWallet: string;
  amount: string;
}

export async function fulfillWithdrawal(
  airnodeRrp: AirnodeRrpV0,
  requestId: string,
  airnodeAddress: string,
  sponsorAddress: string,
  amount: string,
  overrides?: ethers.Overrides
) {
  const tx = await airnodeRrp.fulfillWithdrawal(requestId, airnodeAddress, sponsorAddress, {
    ...(await parseOverrides(airnodeRrp.provider, overrides)),
    value: ethers.utils.parseEther(amount),
  });
  const filter = airnodeRrp.filters.FulfilledWithdrawal(airnodeAddress, sponsorAddress, requestId, null, null);

  return new Promise<FulfillWithdrawalReturnValue | null>((resolve) =>
    airnodeRrp.once(filter, (airnode, sponsor, withdrawalRequestId, sponsorWallet, amount, event) => {
      if (event.transactionHash !== tx.hash) {
        resolve(null);
      }

      // cast ethers BigNumber for portability
      resolve({ airnode, sponsor, withdrawalRequestId, sponsorWallet, amount: amount.toString() });
    })
  );
}

export async function setWhitelistExpiration(
  requesterAuthorizerWithAirnode: RequesterAuthorizerWithAirnode,
  airnodeAddress: string,
  endpointId: string,
  requesterAddress: string,
  expirationTimestamp: number,
  overrides?: ethers.Overrides
) {
  const tx = await requesterAuthorizerWithAirnode.setWhitelistExpiration(
    airnodeAddress,
    endpointId,
    requesterAddress,
    expirationTimestamp,
    await parseOverrides(requesterAuthorizerWithAirnode.provider, overrides)
  );
  await tx.wait();
}

export async function extendWhitelistExpiration(
  requesterAuthorizerWithAirnode: RequesterAuthorizerWithAirnode,
  airnodeAddress: string,
  endpointId: string,
  requesterAddress: string,
  expirationTimestamp: number,
  overrides?: ethers.Overrides
) {
  const tx = await requesterAuthorizerWithAirnode.extendWhitelistExpiration(
    airnodeAddress,
    endpointId,
    requesterAddress,
    expirationTimestamp,
    await parseOverrides(requesterAuthorizerWithAirnode.provider, overrides)
  );
  await tx.wait();
}

export async function setIndefiniteWhitelistStatus(
  requesterAuthorizerWithAirnode: RequesterAuthorizerWithAirnode,
  airnodeAddress: string,
  endpointId: string,
  requesterAddress: string,
  status: boolean,
  overrides?: ethers.Overrides
) {
  const tx = await requesterAuthorizerWithAirnode.setIndefiniteWhitelistStatus(
    airnodeAddress,
    endpointId,
    requesterAddress,
    status,
    await parseOverrides(requesterAuthorizerWithAirnode.provider, overrides)
  );
  await tx.wait();
}

export async function getWhitelistStatus(
  requesterAuthorizerWithAirnode: RequesterAuthorizerWithAirnode,
  airnodeAddress: string,
  endpointId: string,
  requesterAddress: string
) {
  const { expirationTimestamp, indefiniteWhitelistCount } =
    await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToWhitelistStatus(
      airnodeAddress,
      endpointId,
      requesterAddress
    );

  return {
    expirationTimestamp: expirationTimestamp.toNumber(),
    indefiniteWhitelistCount: indefiniteWhitelistCount.toNumber(),
  };
}

export function isRequesterWhitelisted(
  requesterAuthorizerWithAirnode: RequesterAuthorizerWithAirnode,
  airnodeAddress: string,
  endpointId: string,
  requesterAddress: string
) {
  return requesterAuthorizerWithAirnode.isAuthorized(airnodeAddress, endpointId, requesterAddress);
}

export function generateMnemonic() {
  const wallet = ethers.Wallet.createRandom();
  return wallet.mnemonic.phrase;
}

export function deriveAirnodeAddress(airnodeMnemonic: string) {
  return ethers.Wallet.fromMnemonic(airnodeMnemonic).address;
}
