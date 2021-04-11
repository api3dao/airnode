import { ethers, BigNumberish } from 'ethers';
import * as airnodeAbi from '@airnode/airnode-abi';
import { AirnodeRrp } from '@airnode/protocol';

type Last<T extends any[]> = T extends [...infer _, infer L] ? L : never;
const last = <T extends any[]>(array: T): Last<T> => array[array.length - 1];

const assertAllParamsAreReturned = (params: object, ethersParams: any[]) => {
  if (Object.keys(params).length !== ethersParams.length) {
    throw new Error(`SDK doesn't return some of the parameters!`);
  }
};

// TODO: allow passing overrides for CLI and SDK  - e.g. for setting up gas limit and gas cost

export async function createRequester(airnodeRrp: AirnodeRrp, requesterAdmin: string) {
  await airnodeRrp.createRequester(requesterAdmin);
  const filter = airnodeRrp.filters.RequesterCreated(null, null);

  return new Promise<string>((resolve) =>
    airnodeRrp.once(filter, (requesterIndex) => {
      resolve(requesterIndex.toString());
    })
  );
}

export async function setRequesterAdmin(airnodeRrp: AirnodeRrp, requesterIndex: BigNumberish, requesterAdmin: string) {
  await airnodeRrp.setRequesterAdmin(requesterIndex, requesterAdmin, { gasLimit: 5000000 });
  const filter = airnodeRrp.filters.RequesterUpdated(null, null);

  // TODO: why can't just return requesterIndex at this point?
  return new Promise<string>((resolve) =>
    airnodeRrp.once(filter, (requesterIndex) => {
      resolve(requesterIndex.toString());
    })
  );
}

export async function deriveDesignatedWallet(airnodeRrp: AirnodeRrp, airnodeId: string, requesterIndex: BigNumberish) {
  const airnode = await airnodeRrp.getAirnodeParameters(airnodeId);
  const hdNode = ethers.utils.HDNode.fromExtendedKey(airnode.xpub);
  const designatedWalletNode = hdNode.derivePath(`m/0/${requesterIndex}`);
  return designatedWalletNode.address;
}

export async function endorseClient(airnodeRrp: AirnodeRrp, requesterIndex: BigNumberish, clientAddress: string) {
  await airnodeRrp.setClientEndorsementStatus(requesterIndex, clientAddress, true);
  const filter = airnodeRrp.filters.ClientEndorsementStatusSet(null, null, null);

  return new Promise<string>((resolve) =>
    airnodeRrp.once(filter, (_, clientAddress) => {
      resolve(clientAddress);
    })
  );
}

export async function unendorseClient(airnodeRrp: AirnodeRrp, requesterIndex: BigNumberish, clientAddress: string) {
  await airnodeRrp.setClientEndorsementStatus(requesterIndex, clientAddress, false);
  const filter = airnodeRrp.filters.ClientEndorsementStatusSet(null, null, null);

  return new Promise<string>((resolve) =>
    airnodeRrp.once(filter, (_, clientAddress) => {
      resolve(clientAddress);
    })
  );
}

interface Template {
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
  await airnodeRrp.createTemplate(template.airnodeId, template.endpointId, encodedParameters);
  const filter = airnodeRrp.filters.TemplateCreated(null, null, null, null);

  return new Promise<string>((resolve) =>
    airnodeRrp.once(filter, (templateId) => {
      resolve(templateId);
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
  await airnodeRrp.requestWithdrawal(airnodeId, requesterIndex, designatedWalletAddress, destination);
  const filter = airnodeRrp.filters.WithdrawalRequested(null, null, null, null, null);

  return new Promise<string>((resolve) =>
    airnodeRrp.once(filter, (_, __, withdrawalRequestId) => {
      resolve(withdrawalRequestId);
    })
  );
}

export async function checkWithdrawalRequest(airnodeRrp: AirnodeRrp, withdrawalRequestId: string) {
  const logs = await airnodeRrp.provider.getLogs({
    address: airnodeRrp.address,
    fromBlock: 0,
    topics: [
      ethers.utils.id('WithdrawalFulfilled(bytes32,uint256,bytes32,address,address,uint256)'),
      // these are wrong typings by ethers.js: https://github.com/ethers-io/ethers.js/issues/1434
      null as any,
      null,
      withdrawalRequestId,
    ],
  });
  if (logs.length === 0) {
    return undefined;
  }
  const parsedLog = airnodeRrp.interface.parseLog(logs[0]!);
  return parsedLog.args.amount as string;
}

export async function setAirnodeParameters(airnodeRrp: AirnodeRrp, airnodeAdmin: string, authorizers: string[]) {
  const wallet = airnodeRrp.signer as ethers.Wallet; // TODO: verify this
  const hdNode = ethers.utils.HDNode.fromMnemonic(wallet.mnemonic.phrase);
  const xpub = hdNode.neuter().extendedKey;
  const masterWallet = ethers.Wallet.fromMnemonic(wallet.mnemonic.phrase, 'm').connect(
    airnodeRrp.provider as ethers.providers.Provider
  );
  // Assuming masterWallet has funds to make the transaction below
  await airnodeRrp.connect(masterWallet).setAirnodeParametersAndForwardFunds(airnodeAdmin, xpub, authorizers);
  const filter = airnodeRrp.filters.AirnodeParametersSet(null, null, null, null);

  return new Promise<string>((resolve) =>
    airnodeRrp.once(filter, (airnodeId) => {
      resolve(airnodeId);
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

export async function requesterIndexToNoWithdrawalRequests(airnodeRrp: AirnodeRrp, requesterIndex: BigNumberish) {
  const requestsCount = await airnodeRrp.requesterIndexToNoWithdrawalRequests(requesterIndex);
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

export async function fulfilWithdrawal(
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
  // TODO: update check withdrawal similarly
  const filter = airnodeRrp.filters.WithdrawalFulfilled(
    null,
    ethers.BigNumber.from(requesterIndex),
    null,
    null,
    null,
    null
  );

  return new Promise<FulfillWithdrawalReturnValue>((resolve) =>
    // TODO: update other filters in this file
    airnodeRrp.once(filter, (...args) => {
      // remove array parameters from ethers response
      const { airnodeId, requesterIndex, designatedWallet, destination, amount, withdrawalRequestId } = last(args).args;
      const params = { airnodeId, requesterIndex, designatedWallet, destination, amount, withdrawalRequestId };

      // cast ethers BigNumber for portability
      resolve({ ...params, amount: amount.toString(), requesterIndex: requesterIndex.toString() });
    })
  );
}
