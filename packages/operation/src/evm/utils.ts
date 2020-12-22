import { ethers } from 'ethers';
import { APIProvider } from '../types';

export function deriveExtendedPublicKey(mnemonic: string) {
  const wallet = ethers.Wallet.fromMnemonic(mnemonic);
  const hdNode = ethers.utils.HDNode.fromMnemonic(wallet.mnemonic.phrase);
  return hdNode.neuter().extendedKey;
}

export function deriveProviderId(apiProvider: APIProvider) {
  return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [apiProvider.address]));
}

export function deriveWalletFromPath(mnemonic: string, path: string, provider: ethers.providers.JsonRpcProvider) {
  const masterHdNode = ethers.utils.HDNode.fromMnemonic(mnemonic);
  const designatorHdNode = masterHdNode.derivePath(path);
  return new ethers.Wallet(designatorHdNode.privateKey, provider);
}
