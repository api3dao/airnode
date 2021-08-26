import { ethers } from 'ethers';
import { getMasterKeyMnemonic } from '../config';
import { Config } from '../types';

/**
 * HD wallets allow us to create multiple accounts from a single mnemonic.
 * Each sponsor creates a designated wallet for each provider to use
 * in order for them to be able to respond to the requests their requesters make.
 *
 * By convention derivation paths start with a master index
 * followed by child indices that can be any integer up to 2^31.
 *
 * Since addresses can be represented as 160bits (20bytes) we can then
 * split it in chunks of 31bits and create a path with the following pattern:
 * m/0/1st31bits/2nd31bits/3rd31bits/4th31bits/5th31bits/6th31bits.
 *
 * @param sponsorAddress A string representing a 20bytes hex address
 * @returns The path derived from the address
 */
export const deriveWalletPathFromSponsorAddress = (sponsorAddress: string): string => {
  const sponsorAddressBN = ethers.BigNumber.from(ethers.utils.getAddress(sponsorAddress));
  const paths = [];
  // eslint-disable-next-line functional/no-let, functional/no-loop-statement
  for (let i = 0; i < 6; i++) {
    const shiftedSponsorAddressBN = sponsorAddressBN.shr(31 * i);
    paths.push(shiftedSponsorAddressBN.mask(31).toString());
  }
  return `m/0/${paths.join('/')}`;
};

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

export function deriveSponsorWalletAddress(masterHDNode: ethers.utils.HDNode, sponsorAddress: string): string {
  const sponsorWalletHdNode = masterHDNode.derivePath(deriveWalletPathFromSponsorAddress(sponsorAddress));
  return sponsorWalletHdNode.address;
}

export function deriveSponsorWallet(masterHDNode: ethers.utils.HDNode, sponsorAddress: string): ethers.Wallet {
  const sponsorWalletHdNode = masterHDNode.derivePath(deriveWalletPathFromSponsorAddress(sponsorAddress));
  return getWallet(sponsorWalletHdNode.privateKey);
}
