import { PROTOCOL_IDS } from '@api3/airnode-protocol';
import { ethers } from 'ethers';

export function deriveEndpointId(oisTitle: string, endpointName: string): string {
  const { keccak256, defaultAbiCoder } = ethers.utils;
  return keccak256(defaultAbiCoder.encode(['string', 'string'], [oisTitle, endpointName]));
}

export function deriveWalletFromMnemonic(mnemonic: string, provider: ethers.providers.JsonRpcProvider, path?: string) {
  return ethers.Wallet.fromMnemonic(mnemonic, path).connect(provider);
}

export function getSponsorWallet(mnemonic: string, provider: ethers.providers.JsonRpcProvider, sponsorAddress: string) {
  return deriveWalletFromMnemonic(
    mnemonic,
    provider,
    `m/44'/60'/0'/${deriveWalletPathFromSponsorAddress(sponsorAddress)}`
  );
}

/**
 * HD wallets allow us to create multiple accounts from a single mnemonic.
 * Each sponsor creates a designated wallet for each provider to use
 * in order for them to be able to respond to the requests their requesters make.
 *
 * By convention derivation paths start with a master index
 * followed by child indexes that can be any integer up to 2^31.
 *
 * Since addresses can be represented as 160bits (20bytes) we can then
 * split it in chunks of 31bits and create a path with the following pattern:
 * 1/1st31bits/2nd31bits/3rd31bits/4th31bits/5th31bits/6th31bits.
 *
 * @param sponsorAddress A string representing a 20bytes hex address
 * @returns The path derived from the address
 */
export const deriveWalletPathFromSponsorAddress = (sponsorAddress: string): string => {
  const sponsorAddressBN = ethers.BigNumber.from(ethers.utils.getAddress(sponsorAddress));
  const paths = [];
  for (let i = 0; i < 6; i++) {
    const shiftedSponsorAddressBN = sponsorAddressBN.shr(31 * i);
    paths.push(shiftedSponsorAddressBN.mask(31).toString());
  }
  return `${PROTOCOL_IDS.RRP}/${paths.join('/')}`;
};
