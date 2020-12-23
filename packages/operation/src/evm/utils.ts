import { ethers } from 'ethers';

export function deriveExtendedPublicKey(mnemonic: string) {
  const wallet = ethers.Wallet.fromMnemonic(mnemonic);
  const hdNode = ethers.utils.HDNode.fromMnemonic(wallet.mnemonic.phrase);
  return hdNode.neuter().extendedKey;
}

export function deriveProviderId(apiProviderAddress: string) {
  return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [apiProviderAddress]));
}

export function deriveWalletFromPath(mnemonic: string, path: string, provider: ethers.providers.JsonRpcProvider) {
  const masterHdNode = ethers.utils.HDNode.fromMnemonic(mnemonic);
  const designatorHdNode = masterHdNode.derivePath(path);
  return new ethers.Wallet(designatorHdNode.privateKey, provider);
}

export function getDesignatedWallet(
  mnemonic: string,
  requesterIndex: string,
  provider: ethers.providers.JsonRpcProvider
) {
  return deriveWalletFromPath(mnemonic, `m/0/0/${requesterIndex}`, provider);
}
