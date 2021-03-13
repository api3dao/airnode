import { ethers } from 'ethers';
import * as airnodeAbi from '@airnode/airnode-abi';

export async function createRequester(airnodeRrp, requesterAdmin) {
  const receipt = await airnodeRrp.createRequester(requesterAdmin);
  return new Promise((resolve) =>
    airnodeRrp.provider.once(receipt.hash, (tx) => {
      const parsedLog = airnodeRrp.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.requesterIndex.toString());
    })
  );
}

export async function setRequesterAdmin(airnodeRrp, requesterIndex, requesterAdmin) {
  const receipt = await airnodeRrp.setRequesterAdmin(requesterIndex, requesterAdmin);
  return new Promise((resolve) =>
    airnodeRrp.provider.once(receipt.hash, (tx) => {
      const parsedLog = airnodeRrp.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.admin);
    })
  );
}

export async function deriveDesignatedWallet(airnodeRrp, airnodeId, requesterIndex) {
  const airnode = await airnodeRrp.getAirnodeParameters(airnodeId);
  const hdNode = ethers.utils.HDNode.fromExtendedKey(airnode.xpub);
  const designatedWalletNode = hdNode.derivePath(`m/0/${requesterIndex}`);
  return designatedWalletNode.address;
}

export async function endorseClient(airnodeRrp, requesterIndex, clientAddress) {
  const receipt = await airnodeRrp.setClientEndorsementStatus(requesterIndex, clientAddress, true);
  return new Promise((resolve) =>
    airnodeRrp.provider.once(receipt.hash, (tx) => {
      const parsedLog = airnodeRrp.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.clientAddress);
    })
  );
}

export async function unendorseClient(airnodeRrp, requesterIndex, clientAddress) {
  const receipt = await airnodeRrp.setClientEndorsementStatus(requesterIndex, clientAddress, false);
  return new Promise((resolve) =>
    airnodeRrp.provider.once(receipt.hash, (tx) => {
      const parsedLog = airnodeRrp.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.clientAddress);
    })
  );
}

export async function createTemplate(airnodeRrp, template) {
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

export async function requestWithdrawal(airnodeRrp, airnodeId, requesterIndex, destination) {
  const designatedWalletAddress = deriveDesignatedWallet(airnodeRrp, airnodeId, requesterIndex);
  const receipt = await airnodeRrp.requestWithdrawal(airnodeId, requesterIndex, designatedWalletAddress, destination);
  return new Promise((resolve) =>
    airnodeRrp.provider.once(receipt.hash, (tx) => {
      const parsedLog = airnodeRrp.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.withdrawalRequestId);
    })
  );
}

export async function checkWithdrawalRequest(airnodeRrp, withdrawalRequestId) {
  const logs = await airnodeRrp.provider.getLogs({
    address: airnodeRrp.address,
    fromBlock: 0,
    topics: [
      ethers.utils.id('WithdrawalFulfilled(bytes32,uint256,bytes32,address,address,uint256)'),
      null,
      null,
      withdrawalRequestId,
    ],
  });
  if (logs.length === 0) {
    return undefined;
  }
  const parsedLog = airnodeRrp.interface.parseLog(logs[0]);
  return parsedLog.args.amount;
}

export async function setAirnodeParameters(airnodeRrp, airnodeAdmin, authorizers) {
  const hdNode = ethers.utils.HDNode.fromMnemonic(airnodeRrp.signer.mnemonic.phrase);
  const xpub = hdNode.neuter().extendedKey;
  const masterWallet = ethers.Wallet.fromMnemonic(airnodeRrp.signer.mnemonic.phrase, 'm').connect(airnodeRrp.provider);
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

export async function deriveEndpointId(oisTitle, endpointName) {
  return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string'], [`${oisTitle}_${endpointName}`]));
}
