import { ethers } from 'ethers';
import { getMasterKeyMnemonic } from '../config';
import { Config } from '../config/types';

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
 * @returns The path derived from the address
 */
export const deriveWalletPathFromSponsorAddress = (sponsorAddress: string): string => {
  const sponsorAddressBN = ethers.BigNumber.from(ethers.utils.getAddress(sponsorAddress));
  const paths = [];
  for (let i = 0; i < 6; i++) {
    const shiftedSponsorAddressBN = sponsorAddressBN.shr(31 * i);
    paths.push(shiftedSponsorAddressBN.mask(31).toString());
  }
  return `1/${paths.join('/')}`;
};

export function getMasterHDNode(config: Config): ethers.utils.HDNode {
  const mnemonic = getMasterKeyMnemonic(config);
  return ethers.utils.HDNode.fromMnemonic(mnemonic);
}

export function getAirnodeWallet(config: Config): ethers.Wallet {
  const mnemonic = getMasterKeyMnemonic(config);
  return ethers.Wallet.fromMnemonic(mnemonic);
}

export function getExtendedPublicKey(masterHDNode: ethers.utils.HDNode): string {
  return masterHDNode.derivePath("m/44'/60'/0'").neuter().extendedKey;
}

export function getAirnodeAddressShort(airnodeAddress: string): string {
  // NOTE: AWS doesn't allow uppercase letters in S3 bucket and lambda function names
  return airnodeAddress.substring(2, 9).toLowerCase();
}

interface CachedWallet {
  readonly privateKey: string;
  readonly inputParameters: {
    readonly sponsorAddress: string;
    readonly masterPrivateKey: string;
  };
}

/**
 * The derivedSponsorWalletsCache relies on the caching nature of various cloud providers' serverless functions
 * implementation.
 *
 * The caching below will only work where the execution context is re-used by the cloud provider. In situations where
 * the host is not serverless or where this task is executed in a concurrent manner, caching will be ineffective, but
 * shouldn't have any notable impact on performance (if the cache is empty, it's empty).
 */
const derivedSponsorWalletsCache = new Array<CachedWallet>();

export function deriveSponsorWallet(masterHDNode: ethers.utils.HDNode, sponsorAddress: string): ethers.Wallet {
  const cachedWallet = derivedSponsorWalletsCache.find(
    (cachedWallet) =>
      cachedWallet.inputParameters.masterPrivateKey === masterHDNode.privateKey &&
      cachedWallet.inputParameters.sponsorAddress === sponsorAddress
  );

  if (cachedWallet) {
    return new ethers.Wallet(cachedWallet.privateKey);
  }

  const { privateKey } = masterHDNode.derivePath(`m/44'/60'/0'/${deriveWalletPathFromSponsorAddress(sponsorAddress)}`);

  derivedSponsorWalletsCache.push({
    privateKey,
    inputParameters: {
      sponsorAddress,
      masterPrivateKey: masterHDNode.privateKey,
    },
  });

  return new ethers.Wallet(privateKey);
}
