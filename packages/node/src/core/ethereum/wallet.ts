import { ethers } from 'ethers';
import { security } from '../config';

export function getExtendedPublicKey() {
  const hdNode = ethers.utils.HDNode.fromMnemonic(security.masterKeyMnemonic);
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
export function deriveWalletFromIndex(xpub: string, index: number | string) {
  const hdNode = ethers.utils.HDNode.fromExtendedKey(xpub);
  const wallet = hdNode.derivePath(`m/0/0/${index}`);
  return wallet.address;
}
