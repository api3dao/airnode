import { ethers } from 'ethers';
import * as config from '../config';

export function getExtendedPublicKey() {
  const mnemonic = config.getMasterKeyMnemonic();
  const hdNode = ethers.utils.HDNode.fromMnemonic(mnemonic);
  return hdNode.neuter().extendedKey;
}

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

export function getMasterWallet(provider: ethers.providers.JsonRpcProvider) {
  const mnemonic = config.getMasterKeyMnemonic();
  const masterHdNode = ethers.utils.HDNode.fromMnemonic(mnemonic);
  return new ethers.Wallet(masterHdNode.privateKey, provider);
}

export function computeProviderId(provider: ethers.providers.JsonRpcProvider) {
  const masterWallet = getMasterWallet(provider);
  return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [masterWallet.address]));
}

export function deriveWalletAddressFromIndex(xpub: string, index: number | string) {
  const hdNode = ethers.utils.HDNode.fromExtendedKey(xpub);
  const wallet = hdNode.derivePath(getPathFromIndex(index));
  return wallet.address;
}

export function deriveSigningWalletFromIndex(provider: ethers.providers.JsonRpcProvider, index: number | string) {
  const mnemonic = config.getMasterKeyMnemonic();
  const masterHdNode = ethers.utils.HDNode.fromMnemonic(mnemonic);
  const signerHdNode = masterHdNode.derivePath(getPathFromIndex(index));
  return new ethers.Wallet(signerHdNode.privateKey, provider);
}

export function isAdminWalletIndex(index: string) {
  return index === '0';
}
