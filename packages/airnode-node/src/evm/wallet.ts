import { PROTOCOL_IDS } from '@api3/airnode-protocol';
import { ethers } from 'ethers';
import { getMasterKeyMnemonic, getAirnodeWalletPrivateKey, Config } from '../config';

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
 * 1/1st31bits/2nd31bits/3rd31bits/4th31bits/5th31bits/6th31bits.
 *
 * @param sponsorAddress A string representing a 20bytes hex address
 * @param protocolId An optional string representing the protocol id. Defaults to PROTOCOL_IDS.RRP.
 * @returns The path derived from the address
 */
export const deriveWalletPathFromSponsorAddress = (sponsorAddress: string, protocolId = PROTOCOL_IDS.RRP) => {
  const sponsorAddressBN = ethers.BigNumber.from(ethers.utils.getAddress(sponsorAddress));
  const paths = [];
  for (let i = 0; i < 6; i++) {
    const shiftedSponsorAddressBN = sponsorAddressBN.shr(31 * i);
    paths.push(shiftedSponsorAddressBN.mask(31).toString());
  }
  return `${protocolId}/${paths.join('/')}`;
};

export function getMasterHDNode(config: Config): ethers.utils.HDNode {
  const mnemonic = getMasterKeyMnemonic(config);
  return ethers.utils.HDNode.fromMnemonic(mnemonic);
}

export function getAirnodeWallet(config: Config): ethers.Wallet {
  const mnemonic = getMasterKeyMnemonic(config);
  return ethers.Wallet.fromMnemonic(mnemonic);
}

export function getAirnodeWalletFromPrivateKey(): ethers.Wallet {
  const airnodeWalletPrivateKey = getAirnodeWalletPrivateKey();
  return new ethers.Wallet(airnodeWalletPrivateKey);
}

export function getExtendedPublicKey(masterHDNode: ethers.utils.HDNode): string {
  return masterHDNode.derivePath("m/44'/60'/0'").neuter().extendedKey;
}

export function deriveSponsorWallet(
  masterHDNode: ethers.utils.HDNode,
  sponsorAddress: string,
  protocolId?: string
): ethers.Wallet {
  const sponsorWalletHdNode = masterHDNode.derivePath(
    `m/44'/60'/0'/${deriveWalletPathFromSponsorAddress(sponsorAddress, protocolId)}`
  );
  return new ethers.Wallet(sponsorWalletHdNode.privateKey);
}

export const deriveSponsorWalletFromMnemonic = (airnodeMnemonic: string, sponsorAddress: string, protocolId?: string) =>
  ethers.Wallet.fromMnemonic(
    airnodeMnemonic,
    `m/44'/60'/0'/${deriveWalletPathFromSponsorAddress(sponsorAddress, protocolId)}`
  );
