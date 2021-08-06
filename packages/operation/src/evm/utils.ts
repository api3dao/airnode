import { ethers } from 'ethers';

export function deriveEndpointId(oisTitle: string, endpointName: string): string {
  const { keccak256, defaultAbiCoder } = ethers.utils;
  return keccak256(defaultAbiCoder.encode(['string'], [`${oisTitle}_${endpointName}`]));
}

export function deriveExtendedPublicKey(mnemonic: string): string {
  const hdNode = ethers.utils.HDNode.fromMnemonic(mnemonic);
  return hdNode.neuter().extendedKey;
}

export function deriveWalletFromPath(mnemonic: string, provider: ethers.providers.JsonRpcProvider, path?: string) {
  return ethers.Wallet.fromMnemonic(mnemonic, path).connect(provider);
}

export function getDesignatedWallet(
  mnemonic: string,
  provider: ethers.providers.JsonRpcProvider,
  sponsorAddress: string
) {
  return deriveWalletFromPath(mnemonic, provider, deriveWalletPathFromAddress(sponsorAddress));
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
 * m/0/1st31bits/2nd31bits/3rd31bits/4th31bits/5th31bits/6th31bits.
 *
 * @param address A string representing a 20bytes hex address
 * @returns The path derived from the address
 */
export const deriveWalletPathFromAddress = (address: string): string => {
  const addressBN = ethers.BigNumber.from(ethers.utils.getAddress(address));
  const paths = [];
  for (let i = 0; i < 6; i++) {
    const shiftedAddressBN = addressBN.shr(31 * i);
    paths.push(shiftedAddressBN.mask(31).toString());
  }
  return `m/0/${paths.join('/')}`;
};
