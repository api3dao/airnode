import * as ethers from 'ethers';

export function deriveProviderId(mnemonic) {
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(['address'], [deriveMasterWalletAddress(mnemonic)])
  );
}

export function deriveMasterWalletAddress(mnemonic) {
  const masterWallet = ethers.utils.HDNode.fromMnemonic(mnemonic);
  return masterWallet.address;
}

export function generateMnemonic() {
  const masterWallet = ethers.Wallet.createRandom();
  return masterWallet.mnemonic.phrase;
}

export function shortenProviderId(providerId) {
  if (!ethers.utils.isHexString(providerId, 32)) {
    throw new Error('providerId is not a valid hex string');
  }
  return providerId.substring(2, 9);
}
