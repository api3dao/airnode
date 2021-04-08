import { ethers } from 'ethers';
import * as airnodeAbi from '@airnode/airnode-abi';
import { AirnodeRrp } from '@airnode/protocol';

export async function createRequester(airnodeRrp: AirnodeRrp, requesterAdmin: string) {
  await airnodeRrp.createRequester(requesterAdmin);
  const filter = airnodeRrp.filters.RequesterCreated(null, null);

  return new Promise<string>((resolve) =>
    airnodeRrp.provider.once(filter, (_, requesterIndex) => {
      resolve(requesterIndex);
    })
  );
}

export async function setRequesterAdmin(airnodeRrp: AirnodeRrp, requesterIndex: string, requesterAdmin: string) {
  await airnodeRrp.setRequesterAdmin(requesterIndex, requesterAdmin);
  const filter = airnodeRrp.filters.RequesterUpdated(null, null);

  return new Promise<string>((resolve) =>
    airnodeRrp.once(filter, (_, requesterIndex) => {
      resolve(requesterIndex);
    })
  );
}

export async function deriveDesignatedWallet(airnodeRrp: AirnodeRrp, airnodeId: string, requesterIndex: string) {
  const airnode = await airnodeRrp.getAirnodeParameters(airnodeId);
  const hdNode = ethers.utils.HDNode.fromExtendedKey(airnode.xpub);
  const designatedWalletNode = hdNode.derivePath(`m/0/${requesterIndex}`);
  return designatedWalletNode.address;
}

export async function endorseClient(airnodeRrp: AirnodeRrp, requesterIndex: string, clientAddress: string) {
  await airnodeRrp.setClientEndorsementStatus(requesterIndex, clientAddress, true);
  const filter = airnodeRrp.filters.ClientEndorsementStatusSet(null, null, null);

  return new Promise<string>((resolve) =>
    airnodeRrp.once(filter, (_, clientAddress) => {
      resolve(clientAddress);
    })
  );
}

export async function unendorseClient(airnodeRrp: AirnodeRrp, requesterIndex: string, clientAddress: string) {
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
  requesterIndex: string,
  destination: string
) {
  const designatedWalletAddress = await deriveDesignatedWallet(airnodeRrp, airnodeId, requesterIndex); // TODO: this was probably a bug before, test it
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
  const wallet = airnodeRrp.signer as ethers.Wallet;
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
