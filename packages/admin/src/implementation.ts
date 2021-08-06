import { ethers, BigNumberish } from 'ethers';
import * as airnodeAbi from '@api3/airnode-abi';
import { AirnodeRrp } from '@api3/protocol';

type Last<T extends any[]> = T extends [...infer _, infer L] ? L : never;
const last = <T extends any[]>(array: T): Last<T> => array[array.length - 1];

const assertAllParamsAreReturned = (params: object, ethersParams: any[]) => {
  if (Object.keys(params).length !== ethersParams.length) {
    throw new Error(`SDK doesn't return some of the parameters!`);
  }
};

export async function createRequester(airnodeRrp: AirnodeRrp, requesterAdmin: string) {
  const tx = await airnodeRrp.createRequester(requesterAdmin);

  return new Promise<string>((resolve) =>
    airnodeRrp.provider.once(tx.hash, ({ logs }) => {
      const parsedLog = airnodeRrp.interface.parseLog(logs[0]);
      resolve(parsedLog.args.requesterIndex.toString());
    })
  );
}

export async function setRequesterAdmin(airnodeRrp: AirnodeRrp, requesterIndex: BigNumberish, requesterAdmin: string) {
  await airnodeRrp.setRequesterAdmin(requesterIndex, requesterAdmin, { gasLimit: 5000000 });
  return requesterIndex;
}

export async function deriveDesignatedWallet(airnodeRrp: AirnodeRrp, airnodeId: string, requesterIndex: BigNumberish) {
  const airnode = await airnodeRrp.getAirnodeParameters(airnodeId);
  const hdNode = ethers.utils.HDNode.fromExtendedKey(airnode.xpub);
  const designatedWalletNode = hdNode.derivePath(`m/0/${requesterIndex}`);
  return designatedWalletNode.address;
}

export async function endorseClient(airnodeRrp: AirnodeRrp, requesterIndex: BigNumberish, clientAddress: string) {
  await airnodeRrp.setClientEndorsementStatus(requesterIndex, clientAddress, true);
  return clientAddress;
}

export async function unendorseClient(airnodeRrp: AirnodeRrp, requesterIndex: BigNumberish, clientAddress: string) {
  await airnodeRrp.setClientEndorsementStatus(requesterIndex, clientAddress, false);
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
  requesterIndex: BigNumberish,
  destination: string
) {
  const designatedWalletAddress = await deriveDesignatedWallet(airnodeRrp, airnodeId, requesterIndex);
  const tx = await airnodeRrp.requestWithdrawal(airnodeId, requesterIndex, designatedWalletAddress, destination);

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
  const { airnodeId, amount, designatedWallet, destination, requesterIndex, withdrawalRequestId } = ethersLogParams;
  const logParams = { airnodeId, amount, designatedWallet, destination, requesterIndex, withdrawalRequestId };
  assertAllParamsAreReturned(logParams, ethersLogParams);

  // cast ethers BigNumber for portability
  return { ...logParams, amount: amount.toString(), requesterIndex: requesterIndex.toString() };
}

const isEthersWallet = (signer: any): signer is ethers.Wallet => !!signer.mnemonic;

export async function setAirnodeParameters(airnodeRrp: AirnodeRrp, airnodeAdmin: string, authorizers: string[]) {
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
  const tx = await airnodeRrp
    .connect(masterWallet)
    .setAirnodeParametersAndForwardFunds(airnodeAdmin, xpub, authorizers);

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
  const { admin, authorizers, xpub, blockNumber } = ethersParams;
  const params = { admin, authorizers, xpub, blockNumber };
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

export function requesterIndexToAdmin(airnodeRrp: AirnodeRrp, requesterIndex: BigNumberish) {
  return airnodeRrp.requesterIndexToAdmin(requesterIndex);
}

export function requesterIndexToClientAddressToEndorsementStatus(
  airnodeRrp: AirnodeRrp,
  requesterIndex: BigNumberish,
  clientAddress: string
) {
  return airnodeRrp.requesterIndexToClientAddressToEndorsementStatus(requesterIndex, clientAddress);
}

export async function requesterIndexToNextWithdrawalRequestIndex(airnodeRrp: AirnodeRrp, requesterIndex: BigNumberish) {
  const requestsCount = await airnodeRrp.requesterIndexToNextWithdrawalRequestIndex(requesterIndex);
  return requestsCount.toString();
}

export interface FulfillWithdrawalReturnValue {
  airnodeId: string;
  requesterIndex: string;
  designatedWallet: string;
  destination: string;
  amount: string;
  withdrawalRequestId: string;
}

export async function fulfillWithdrawal(
  airnodeRrp: AirnodeRrp,
  requestId: string,
  airnodeId: string,
  requesterIndex: BigNumberish,
  destination: string,
  amount: string
) {
  await airnodeRrp.fulfillWithdrawal(requestId, airnodeId, requesterIndex, destination, {
    value: ethers.utils.parseEther(amount),
  });
  const filter = airnodeRrp.filters.WithdrawalFulfilled(
    airnodeId,
    ethers.BigNumber.from(requesterIndex),
    requestId,
    null,
    null,
    null
  );

  return new Promise<FulfillWithdrawalReturnValue>((resolve) =>
    airnodeRrp.once(filter, (...args) => {
      // remove array parameters from ethers response
      const { airnodeId, requesterIndex, designatedWallet, destination, amount, withdrawalRequestId } = last(args).args;
      const params = { airnodeId, requesterIndex, designatedWallet, destination, amount, withdrawalRequestId };

      // cast ethers BigNumber for portability
      resolve({ ...params, amount: amount.toString(), requesterIndex: requesterIndex.toString() });
    })
  );
}
