import { ethers } from 'ethers';

export function deriveEndpointId(oisTitle: string, endpointName: string): string {
  const { keccak256, defaultAbiCoder } = ethers.utils;
  return keccak256(defaultAbiCoder.encode(['string'], [`${oisTitle}_${endpointName}`]));
}

export function deriveExtendedPublicKey(mnemonic: string): string {
  const wallet = ethers.Wallet.fromMnemonic(mnemonic);
  const hdNode = ethers.utils.HDNode.fromMnemonic(wallet.mnemonic.phrase);
  return hdNode.neuter().extendedKey;
}

export function deriveAirnodeId(masterWalletAddress: string): string {
  return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [masterWalletAddress]));
}

export function deriveWalletFromPath(mnemonic: string, path: string, provider: ethers.providers.JsonRpcProvider) {
  const masterHdNode = ethers.utils.HDNode.fromMnemonic(mnemonic);
  const designatorHdNode = masterHdNode.derivePath(path);
  return new ethers.Wallet(designatorHdNode.privateKey, provider);
}

export function getDesignatedWallet(mnemonic: string, requester: string, provider: ethers.providers.JsonRpcProvider) {
  return deriveWalletFromPath(mnemonic, `m/0/${addressToDerivationPath(requester)}`, provider);
}

/**
 * HD wallets allow us to create multiple accounts from a single mnemonic.
 * Each requester creates a designated wallet for each provider to use
 * in order for them to be able to respond to the requests their clients make.
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
export function addressToDerivationPath(address: string): string {
  const requesterBN = ethers.BigNumber.from(address);
  const paths = [];
  // eslint-disable-next-line functional/no-let
  for (let i = 0; i < 6; i++) {
    const shiftedRequesterBN = requesterBN.shr(31 * i);
    paths.push(shiftedRequesterBN.mask(31).toString());
  }
  return paths.join('/');
}
