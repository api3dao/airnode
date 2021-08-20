import { ethers } from 'ethers';
import { getMasterKeyMnemonic } from '../config';
import { Config } from '../types';

// 2^31-1 different wallets can be designated as below
// m/0/0: masterWalletAddress
// m/0/1: First reserved wallet path
// m/0/2: Second reserved wallet path
// ...
// m/0/2^31-1 (each index is represented in 31-bits)
// Although this can be extended as m/0/*/... it will not be needed.
function getPathFromIndex(index: number | string) {
  return `m/0/${index}`;
}

export function getMasterHDNode(config: Config): ethers.utils.HDNode {
  const mnemonic = getMasterKeyMnemonic(config);
  return ethers.utils.HDNode.fromMnemonic(mnemonic);
}

export function getExtendedPublicKey(masterHDNode: ethers.utils.HDNode): string {
  return masterHDNode.neuter().extendedKey;
}

export function getWallet(privateKey: string): ethers.Wallet {
  return new ethers.Wallet(privateKey);
}

export function getAirnodeAddressShort(airnodeAddress: string): string {
  return airnodeAddress.substring(2, 9);
}

export function deriveWalletAddressFromIndex(masterHDNode: ethers.utils.HDNode, index: number | string): string {
  const wallet = masterHDNode.derivePath(getPathFromIndex(index));
  return wallet.address;
}

export function deriveSigningWalletFromIndex(masterHDNode: ethers.utils.HDNode, index: number | string): ethers.Wallet {
  const signerHDNode = masterHDNode.derivePath(getPathFromIndex(index));
  return getWallet(signerHDNode.privateKey);
}

export function isAdminWalletIndex(index: string): boolean {
  return index === '0';
}
