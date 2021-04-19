import * as ethers from 'ethers';

export function validateMnemonic(mnemonic) {
  try {
    ethers.Wallet.fromMnemonic(mnemonic);
  } catch {
    return false;
  }
  return true;
}

export function deriveAirnodeId(mnemonic) {
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(['address'], [deriveMasterWalletAddress(mnemonic)])
  );
}

export function deriveMasterWalletAddress(mnemonic) {
  const masterWallet = ethers.utils.HDNode.fromMnemonic(mnemonic);
  return masterWallet.address;
}

export function deriveXpub(mnemonic) {
  const hdNode = ethers.utils.HDNode.fromMnemonic(mnemonic);
  return hdNode.neuter().extendedKey;
}

export function generateMnemonic() {
  const masterWallet = ethers.Wallet.createRandom();
  return masterWallet.mnemonic.phrase;
}

export function shortenAirnodeId(airnodeId) {
  if (!ethers.utils.isHexString(airnodeId, 32)) {
    throw new Error('airnodeId is not a valid hex string');
  }
  return airnodeId.substring(2, 9);
}
