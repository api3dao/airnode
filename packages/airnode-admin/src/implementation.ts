import * as airnodeAbi from '@api3/airnode-abi';
import { AirnodeRrp, RequesterAuthorizerWithAirnode } from '@api3/airnode-protocol';
import { ethers } from 'ethers';
import { Arguments } from 'yargs';

const assertAllParamsAreReturned = (params: object, ethersParams: any[]) => {
  if (Object.keys(params).length !== ethersParams.length) {
    throw new Error(`SDK doesn't return some of the parameters!`);
  }
};

/**
 * Parses Ethers transaction override options from CLI arguments.
 * @param args The yargs inferred CLI arguments object
 * @returns The parsed overrides object with values compatible with ethers
 */
export const parseTransactionOverrides = (
  args: Arguments | { [key: string]: string }
): ethers.Overrides | ethers.PayableOverrides => {
  if ((args['max-fee'] || args['max-priority-fee']) && args['gas-price'])
    throw new Error('EIP-1559 transactions cannot have gas-price argument');
  if ((args['max-fee'] && !args['max-priority-fee']) || (!args['max-fee'] && args['max-priority-fee']))
    throw new Error('EIP-1559 transactions require both max-fee and max-priority-fee arguments');
  if (args['value'] && ethers.utils.parseEther(args['value'] as string).lt(0))
    throw new Error('Value argument cannot be negative');

  const overrideMap = [
    { name: 'gas-limit', key: 'gasLimit', parseValue: (value: string) => ethers.BigNumber.from(value) },
    { name: 'gas-price', key: 'gasPrice', parseValue: (value: string) => ethers.utils.parseUnits(value, 'gwei') },
    { name: 'max-fee', key: 'maxFeePerGas', parseValue: (value: string) => ethers.utils.parseUnits(value, 'gwei') },
    {
      name: 'max-priority-fee',
      key: 'maxPriorityFeePerGas',
      parseValue: (value: string) => ethers.utils.parseUnits(value, 'gwei'),
    },
    { name: 'value', key: 'value', parseValue: (value: string) => ethers.utils.parseEther(value) },
  ];

  const overrides: ethers.Overrides | ethers.PayableOverrides = overrideMap.reduce((acc, override) => {
    if (args[override.name]) return { ...acc, [override.key]: override.parseValue(args[override.name] as string) };
    return acc;
  }, {});

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
  return `1/${paths.join('/')}`;
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

export async function deriveSponsorWalletAddress(airnodeXpub: string, airnodeAddress: string, sponsorAddress: string) {
  const hdNode = verifyAirnodeXpub(airnodeXpub, airnodeAddress);
  const derivationPath = deriveWalletPathFromSponsorAddress(sponsorAddress);
  return hdNode.derivePath(derivationPath).address;
}

export async function sponsorRequester(airnodeRrp: AirnodeRrp, requesterAddress: string, overrides?: ethers.Overrides) {
  await airnodeRrp.setSponsorshipStatus(requesterAddress, true, { ...overrides });
  return requesterAddress;
}

export async function unsponsorRequester(
  airnodeRrp: AirnodeRrp,
  requesterAddress: string,
  overrides?: ethers.Overrides
) {
  await airnodeRrp.setSponsorshipStatus(requesterAddress, false, { ...overrides });
  return requesterAddress;
}

export interface Template {
  parameters: string | airnodeAbi.InputParameter[];
  airnode: string;
  endpointId: string;
}

export async function createTemplate(airnodeRrp: AirnodeRrp, template: Template, overrides?: ethers.Overrides) {
  let encodedParameters;
  if (typeof template.parameters == 'string') {
    encodedParameters = template.parameters;
  } else {
    encodedParameters = airnodeAbi.encode(template.parameters);
  }
  const tx = await airnodeRrp.createTemplate(template.airnode, template.endpointId, encodedParameters, {
    ...overrides,
  });

  return new Promise<string>((resolve) =>
    airnodeRrp.provider.once(tx.hash, ({ logs }) => {
      const parsedLog = airnodeRrp.interface.parseLog(logs[0]);
      resolve(parsedLog.args.templateId);
    })
  );
}

export async function requestWithdrawal(
  airnodeRrp: AirnodeRrp,
  airnodeAddress: string,
  sponsorWalletAddress: string,
  overrides?: ethers.Overrides
) {
  const tx = await airnodeRrp.requestWithdrawal(airnodeAddress, sponsorWalletAddress, { ...overrides });

  return new Promise<string>((resolve) =>
    airnodeRrp.provider.once(tx.hash, ({ logs }) => {
      const parsedLog = airnodeRrp.interface.parseLog(logs[0]);
      resolve(parsedLog.args.withdrawalRequestId);
    })
  );
}

export async function checkWithdrawalRequest(airnodeRrp: AirnodeRrp, requestId: string) {
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

export async function deriveEndpointId(oisTitle: string, endpointName: string) {
  return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string', 'string'], [oisTitle, endpointName]));
}

export async function requesterToRequestCountPlusOne(
  airnodeRrp: AirnodeRrp,
  requesterAddress: string,
  overrides?: ethers.Overrides
) {
  return (await airnodeRrp.requesterToRequestCountPlusOne(requesterAddress, { ...overrides })).toString();
}

export async function getTemplate(airnodeRrp: AirnodeRrp, templateId: string) {
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

export async function getTemplates(airnodeRrp: AirnodeRrp, templateIds: string[]) {
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
  airnodeRrp: AirnodeRrp,
  sponsorAddress: string,
  requesterAddress: string
) {
  return airnodeRrp.sponsorToRequesterToSponsorshipStatus(sponsorAddress, requesterAddress);
}

export async function sponsorToWithdrawalRequestCount(airnodeRrp: AirnodeRrp, sponsorAddress: string) {
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
  airnodeRrp: AirnodeRrp,
  requestId: string,
  airnodeAddress: string,
  sponsorAddress: string,
  overrides?: ethers.PayableOverrides
) {
  const tx = await airnodeRrp.fulfillWithdrawal(requestId, airnodeAddress, sponsorAddress, { ...overrides });
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
    { ...overrides }
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
    { ...overrides }
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
    { ...overrides }
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

export async function isRequesterWhitelisted(
  requesterAuthorizerWithAirnode: RequesterAuthorizerWithAirnode,
  airnodeAddress: string,
  endpointId: string,
  requesterAddress: string
) {
  return requesterAuthorizerWithAirnode.requesterIsWhitelisted(airnodeAddress, endpointId, requesterAddress);
}

export async function generateMnemonic() {
  const wallet = ethers.Wallet.createRandom();
  return wallet.mnemonic.phrase;
}

export async function deriveAirnodeAddress(airnodeMnemonic: string) {
  return ethers.Wallet.fromMnemonic(airnodeMnemonic).address;
}
