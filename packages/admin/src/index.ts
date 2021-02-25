import { ethers } from 'ethers';
import * as airnodeAbi from '@airnode/airnode-abi';

export async function createRequester(airnode, requesterAdmin) {
  const receipt = await airnode.createRequester(requesterAdmin);
  return new Promise((resolve) =>
    airnode.provider.once(receipt.hash, (tx) => {
      const parsedLog = airnode.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.requesterIndex.toString());
    })
  );
}

export async function updateRequesterAdmin(airnode, requesterIndex, requesterAdmin) {
  const receipt = await airnode.updateRequesterAdmin(requesterIndex, requesterAdmin);
  return new Promise((resolve) =>
    airnode.provider.once(receipt.hash, (tx) => {
      const parsedLog = airnode.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.admin);
    })
  );
}

export async function deriveDesignatedWallet(airnode, providerId, requesterIndex) {
  const provider = await airnode.getProvider(providerId);
  const hdNode = ethers.utils.HDNode.fromExtendedKey(provider.xpub);
  const designatedWalletNode = hdNode.derivePath(`m/0/${requesterIndex}`);
  return designatedWalletNode.address;
}

export async function endorseClient(airnode, requesterIndex, clientAddress) {
  const receipt = await airnode.updateClientEndorsementStatus(requesterIndex, clientAddress, true);
  return new Promise((resolve) =>
    airnode.provider.once(receipt.hash, (tx) => {
      const parsedLog = airnode.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.clientAddress);
    })
  );
}

export async function unendorseClient(airnode, requesterIndex, clientAddress) {
  const receipt = await airnode.updateClientEndorsementStatus(requesterIndex, clientAddress, false);
  return new Promise((resolve) =>
    airnode.provider.once(receipt.hash, (tx) => {
      const parsedLog = airnode.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.clientAddress);
    })
  );
}

export async function createTemplate(airnode, template) {
  let encodedParameters;
  if (typeof template.parameters == 'string') {
    encodedParameters = template.parameters;
  } else {
    encodedParameters = airnodeAbi.encode(template.parameters);
  }
  const receipt = await airnode.createTemplate(template.providerId, template.endpointId, encodedParameters);
  return new Promise((resolve) =>
    airnode.provider.once(receipt.hash, (tx) => {
      const parsedLog = airnode.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.templateId);
    })
  );
}

export async function requestWithdrawal(airnode, providerId, requesterIndex, destination) {
  const designatedWalletAddress = deriveDesignatedWallet(airnode, providerId, requesterIndex);
  const receipt = await airnode.requestWithdrawal(providerId, requesterIndex, designatedWalletAddress, destination);
  return new Promise((resolve) =>
    airnode.provider.once(receipt.hash, (tx) => {
      const parsedLog = airnode.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.withdrawalRequestId);
    })
  );
}

export async function checkWithdrawalRequest(airnode, withdrawalRequestId) {
  const logs = await airnode.provider.getLogs({
    address: airnode.address,
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
  const parsedLog = airnode.interface.parseLog(logs[0]);
  return parsedLog.args.amount;
}

export async function createProvider(airnode, providerAdmin, authorizers) {
  const hdNode = ethers.utils.HDNode.fromMnemonic(airnode.signer.mnemonic.phrase);
  const xpub = hdNode.neuter().extendedKey;
  const masterWallet = ethers.Wallet.fromMnemonic(airnode.signer.mnemonic.phrase, 'm').connect(airnode.provider);
  // Assuming masterWallet has funds to make the transaction below
  const receipt = await airnode.connect(masterWallet).createProviderAndForwardFunds(providerAdmin, xpub, authorizers);
  return new Promise((resolve) =>
    airnode.provider.once(receipt.hash, (tx) => {
      const parsedLog = airnode.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.providerId.toString());
    })
  );
}

export async function deriveEndpointId(oisTitle, endpointName) {
  return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string'], [`${oisTitle}/${endpointName}`]));
}
