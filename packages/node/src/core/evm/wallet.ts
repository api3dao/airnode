import { ethers } from 'ethers';
import * as config from '../config';

// We can reserve 2^256-1 different wallets as below
// m/0/0/0: designatorAddress
// m/0/0/1: First reserved wallet path
// m/0/0/2: Second reserved wallet path
// ...
// m/0/0/2^31-1 (each index is represented in 31-bits)
// m/0/1/0
// m/0/1/1
// ...
// but there is no need for more than 2^31-1 per provider
function getPathFromIndex(index: number | string) {
  return `m/0/0/${index}`;
}

export function getMasterHDNode(): ethers.utils.HDNode {
  const mnemonic = config.getMasterKeyMnemonic();
  return ethers.utils.HDNode.fromMnemonic(mnemonic);
}

export function getExtendedPublicKey(masterHDNode: ethers.utils.HDNode): string {
  return masterHDNode.neuter().extendedKey;
}

export function getWallet(privateKey: string): ethers.Wallet {
  return new ethers.Wallet(privateKey);
}

export function getProviderId(masterHDNode: ethers.utils.HDNode): string {
  return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [masterHDNode.address]));
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
