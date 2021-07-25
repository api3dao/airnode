import { ethers } from 'ethers';
import * as airnodeAbi from '@api3/airnode-abi';
import { AirnodeRrp } from '@api3/protocol';

type Last<T extends any[]> = T extends [...infer _, infer L] ? L : never;
const last = <T extends any[]>(array: T): Last<T> => array[array.length - 1];

const assertAllParamsAreReturned = (params: object, ethersParams: any[]) => {
  if (Object.keys(params).length !== ethersParams.length) {
    throw new Error(`SDK doesn't return some of the parameters!`);
  }
};

/**
 * HD wallets allow us to create multiple accounts from a single mnemonic.
 * Each requester creates a designated wallet for each provider to use
 * in order for them to be able to respond to the requests their clients make.
 *
 * By convention derivation paths start with a master index
 * followed by child indexes that can be any integer up to 2^31.
 *
 * Since addresses can be represented as 160bits (20bytes) we can then
 * split it in chunks of 31bits and create a path with the following pattern:
 * m/0/1st31bits/2nd31bits/3rd31bits/4th31bits/5th31bits/6th31bits.
 *
 * @param address A string representing a 20bytes hex address
 * @returns The path derived from the address
 */
export const addressToDerivationPath = (address: string): string => {
  const requesterBN = ethers.BigNumber.from(ethers.utils.getAddress(address));
  const paths = [];
  for (let i = 0; i < 6; i++) {
    const shiftedRequesterBN = requesterBN.shr(31 * i);
    paths.push(shiftedRequesterBN.mask(31).toString());
  }
  return paths.join('/');
};

export async function deriveDesignatedWallet(airnodeRrp: AirnodeRrp, airnodeId: string, requester: string) {
  const airnode = await airnodeRrp.getAirnodeParameters(airnodeId);
  const hdNode = ethers.utils.HDNode.fromExtendedKey(airnode.xpub);
  const derivationPath = addressToDerivationPath(requester);
  const designatedWalletNode = hdNode.derivePath(`m/0/${derivationPath}`);
  return designatedWalletNode.address;
}

export async function endorseClient(airnodeRrp: AirnodeRrp, clientAddress: string) {
  await airnodeRrp.setClientEndorsementStatus(clientAddress, true);
  return clientAddress;
}

export async function unendorseClient(airnodeRrp: AirnodeRrp, clientAddress: string) {
  await airnodeRrp.setClientEndorsementStatus(clientAddress, false);
  return clientAddress;
}

export interface Template {
  parameters: string | airnodeAbi.InputParameter[];
  airnodeId: string;
  endpointId: string;
}

export async function createTemplate(airnodeRrp: AirnodeRrp, template: Template) {
  let encodedParameters;
  if (typeof template.parameters == 'string') {
    encodedParameters = template.parameters;
  } else {
    encodedParameters = airnodeAbi.encode(template.parameters);
  }
  const tx = await airnodeRrp.createTemplate(template.airnodeId, template.endpointId, encodedParameters);

  return new Promise<string>((resolve) =>
    airnodeRrp.provider.once(tx.hash, ({ logs }) => {
      const parsedLog = airnodeRrp.interface.parseLog(logs[0]);
      resolve(parsedLog.args.templateId);
    })
  );
}

export async function requestWithdrawal(
  airnodeRrp: AirnodeRrp,
  airnodeId: string,
  requester: string,
  destination: string
) {
  const designatedWalletAddress = await deriveDesignatedWallet(airnodeRrp, airnodeId, requester);
<<<<<<< HEAD
  const tx = await airnodeRrp.requestWithdrawal(airnodeId, designatedWalletAddress, destination);
=======
  await airnodeRrp.requestWithdrawal(airnodeId, designatedWalletAddress, destination);
  const filter = airnodeRrp.filters.WithdrawalRequested(null, null, null, null, null);
>>>>>>> ae70189b... Merge branch 'beta-protocol' into authorizer-tests-combined

  return new Promise<string>((resolve) =>
    airnodeRrp.provider.once(tx.hash, ({ logs }) => {
      const parsedLog = airnodeRrp.interface.parseLog(logs[0]);
      resolve(parsedLog.args.withdrawalRequestId);
    })
  );
}

export async function checkWithdrawalRequest(airnodeRrp: AirnodeRrp, requestId: string) {
  const filter = airnodeRrp.filters.WithdrawalFulfilled(null, null, requestId, null, null, null);

  const logs = await airnodeRrp.queryFilter(filter);
  if (logs.length === 0) {
    return undefined;
  }

  const ethersLogParams = logs[0].args;
  // remove array parameters from ethers response
  const { airnodeId, amount, designatedWallet, destination, requester, withdrawalRequestId } = ethersLogParams;
  const logParams = { airnodeId, amount, designatedWallet, destination, requester, withdrawalRequestId };
  assertAllParamsAreReturned(logParams, ethersLogParams);

  // cast ethers BigNumber for portability
  return { ...logParams, amount: amount.toString() };
}

const isEthersWallet = (signer: any): signer is ethers.Wallet => !!signer.mnemonic;

export async function setAirnodeParameters(airnodeRrp: AirnodeRrp, authorizers: string[]) {
  const wallet = airnodeRrp.signer;

  if (!isEthersWallet(wallet)) {
    throw new Error('Expected AirnodeRrp contract signer must be ethers.Wallet!');
  }

  const hdNode = ethers.utils.HDNode.fromMnemonic(wallet.mnemonic.phrase);
  const xpub = hdNode.neuter().extendedKey;
  const masterWallet = ethers.Wallet.fromMnemonic(wallet.mnemonic.phrase, 'm').connect(
    airnodeRrp.provider as ethers.providers.Provider
  );
  // Assuming masterWallet has funds to make the transaction below
<<<<<<< HEAD
  const tx = await airnodeRrp.connect(masterWallet).setAirnodeParameters(xpub, authorizers);
=======
  await airnodeRrp.connect(masterWallet).setAirnodeParameters(xpub, authorizers);
  const filter = airnodeRrp.filters.AirnodeParametersSet(null, null, null, null);
>>>>>>> ae70189b... Merge branch 'beta-protocol' into authorizer-tests-combined

  return new Promise<string>((resolve) =>
    airnodeRrp.provider.once(tx.hash, ({ logs }) => {
      const parsedLog = airnodeRrp.interface.parseLog(logs[0]);
      resolve(parsedLog.args.airnodeId);
    })
  );
}

export async function deriveEndpointId(oisTitle: string, endpointName: string) {
  return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string'], [`${oisTitle}_${endpointName}`]));
}

export async function clientAddressToNoRequests(airnodeRrp: AirnodeRrp, clientAddress: string) {
  return (await airnodeRrp.clientAddressToNoRequests(clientAddress)).toString();
}

export async function getAirnodeParameters(airnodeRrp: AirnodeRrp, airnodeId: string) {
  const ethersParams = await airnodeRrp.getAirnodeParametersAndBlockNumber(airnodeId);

  // remove array parameters from ethers response
  const { admin, xpub, authorizers, blockNumber } = ethersParams;
  const params = { admin, xpub, authorizers, blockNumber };
  assertAllParamsAreReturned(params, ethersParams);

  // cast ethers BigNumber for portability
  return { ...params, blockNumber: blockNumber.toString() };
}

export async function getTemplate(airnodeRrp: AirnodeRrp, templateId: string) {
  const ethersTemplate = await airnodeRrp.getTemplate(templateId);

  // remove array parameters from ethers response
  const { airnodeId, endpointId, parameters } = ethersTemplate;
  const template = { airnodeId, endpointId, parameters };
  assertAllParamsAreReturned(template, ethersTemplate);

  return template;
}

export async function getTemplates(airnodeRrp: AirnodeRrp, templateIds: string[]) {
  const ethersTemplate = await airnodeRrp.getTemplates(templateIds);

  // remove array parameters from ethers response
  const { airnodeIds, endpointIds, parameters } = ethersTemplate;
  const templates = { airnodeIds, endpointIds, parameters };
  assertAllParamsAreReturned(templates, ethersTemplate);

  const formattedTemplates = airnodeIds.map((_, i) => ({
    airnodeId: airnodeIds[i],
    endpointId: endpointIds[i],
    parameters: parameters[i],
  }));
  return formattedTemplates;
}

export function requesterToClientAddressToEndorsementStatus(
  airnodeRrp: AirnodeRrp,
  requester: string,
  clientAddress: string
) {
  return airnodeRrp.requesterToClientAddressToEndorsementStatus(requester, clientAddress);
}

export async function requesterToNextWithdrawalRequestIndex(airnodeRrp: AirnodeRrp, requester: string) {
  const requestsCount = await airnodeRrp.requesterToNextWithdrawalRequestIndex(requester);
  return requestsCount.toString();
}

export interface FulfillWithdrawalReturnValue {
  airnodeId: string;
  requester: string;
  designatedWallet: string;
  destination: string;
  amount: string;
  withdrawalRequestId: string;
}

export async function fulfillWithdrawal(
  airnodeRrp: AirnodeRrp,
  requestId: string,
  airnodeId: string,
  requester: string,
  destination: string,
  amount: string
) {
  await airnodeRrp.fulfillWithdrawal(requestId, airnodeId, requester, destination, {
    value: ethers.utils.parseEther(amount),
  });
  const filter = airnodeRrp.filters.WithdrawalFulfilled(airnodeId, requester, requestId, null, null, null);

  return new Promise<FulfillWithdrawalReturnValue>((resolve) =>
    airnodeRrp.once(filter, (...args) => {
      // remove array parameters from ethers response
      const { airnodeId, requester, designatedWallet, destination, amount, withdrawalRequestId } = last(args).args;
      const params = { airnodeId, requester, designatedWallet, destination, amount, withdrawalRequestId };

      // cast ethers BigNumber for portability
      resolve({ ...params, amount: amount.toString() });
    })
  );
}
