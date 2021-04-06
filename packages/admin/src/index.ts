import { ethers } from 'ethers';
import * as airnodeAbi from '@airnode/airnode-abi';

// TODO: add stronger types for airnodeRrp contract

export async function createRequester(airnodeRrp: ethers.Contract, requesterAdmin: string) {
  const receipt = await airnodeRrp.createRequester(requesterAdmin);
  return new Promise((resolve) =>
    airnodeRrp.provider.once(receipt.hash, (tx) => {
      const parsedLog = airnodeRrp.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.requesterIndex.toString());
    })
  );
}

export async function setRequesterAdmin(airnodeRrp: ethers.Contract, requesterIndex: string, requesterAdmin: string) {
  const receipt = await airnodeRrp.setRequesterAdmin(requesterIndex, requesterAdmin);
  return new Promise((resolve) =>
    airnodeRrp.provider.once(receipt.hash, (tx) => {
      const parsedLog = airnodeRrp.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.admin);
    })
  );
}

export async function deriveDesignatedWallet(airnodeRrp: ethers.Contract, airnodeId: string, requesterIndex: string) {
  const airnode = await airnodeRrp.getAirnodeParameters(airnodeId);
  const hdNode = ethers.utils.HDNode.fromExtendedKey(airnode.xpub);
  const designatedWalletNode = hdNode.derivePath(`m/0/${requesterIndex}`);
  return designatedWalletNode.address;
}

export async function endorseClient(airnodeRrp: ethers.Contract, requesterIndex: string, clientAddress: string) {
  const receipt = await airnodeRrp.setClientEndorsementStatus(requesterIndex, clientAddress, true);
  return new Promise((resolve) =>
    airnodeRrp.provider.once(receipt.hash, (tx) => {
      const parsedLog = airnodeRrp.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.clientAddress);
    })
  );
}

export async function unendorseClient(airnodeRrp: ethers.Contract, requesterIndex: string, clientAddress: string) {
  const receipt = await airnodeRrp.setClientEndorsementStatus(requesterIndex, clientAddress, false);
  return new Promise((resolve) =>
    airnodeRrp.provider.once(receipt.hash, (tx) => {
      const parsedLog = airnodeRrp.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.clientAddress);
    })
  );
}

// TODO: type me
interface Template {
  parameters: string | airnodeAbi.InputParameter[];
  airnodeId: string;
  endpointId: string;
}

export async function createTemplate(airnodeRrp: ethers.Contract, template: Template) {
  let encodedParameters;
  if (typeof template.parameters == 'string') {
    encodedParameters = template.parameters;
  } else {
    encodedParameters = airnodeAbi.encode(template.parameters);
  }
  const receipt = await airnodeRrp.createTemplate(template.airnodeId, template.endpointId, encodedParameters);
  return new Promise((resolve) =>
    airnodeRrp.provider.once(receipt.hash, (tx) => {
      const parsedLog = airnodeRrp.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.templateId);
    })
  );
}

export async function requestWithdrawal(
  airnodeRrp: ethers.Contract,
  airnodeId: string,
  requesterIndex: string,
  destination: string
) {
  const designatedWalletAddress = deriveDesignatedWallet(airnodeRrp, airnodeId, requesterIndex);
  const receipt = await airnodeRrp.requestWithdrawal(airnodeId, requesterIndex, designatedWalletAddress, destination);
  return new Promise((resolve) =>
    airnodeRrp.provider.once(receipt.hash, (tx) => {
      const parsedLog = airnodeRrp.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.withdrawalRequestId);
    })
  );
}

export async function checkWithdrawalRequest(airnodeRrp: ethers.Contract, withdrawalRequestId: string) {
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
  return parsedLog.args.amount;
}

export async function setAirnodeParameters(
  airnodeRrp: ethers.Contract,
  airnodeAdmin: string,
  authorizers: object /** TODO: */
) {
  const wallet = airnodeRrp.signer as ethers.Wallet;
  const hdNode = ethers.utils.HDNode.fromMnemonic(wallet.mnemonic.phrase);
  const xpub = hdNode.neuter().extendedKey;
  const masterWallet = ethers.Wallet.fromMnemonic(wallet.mnemonic.phrase, 'm').connect(airnodeRrp.provider);
  // Assuming masterWallet has funds to make the transaction below
  const receipt = await airnodeRrp
    .connect(masterWallet)
    .setAirnodeParametersAndForwardFunds(airnodeAdmin, xpub, authorizers);
  return new Promise((resolve) =>
    airnodeRrp.provider.once(receipt.hash, (tx) => {
      const parsedLog = airnodeRrp.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.airnodeId.toString());
    })
  );
}

export async function deriveEndpointId(oisTitle: string, endpointName: string) {
  return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string'], [`${oisTitle}_${endpointName}`]));
}
