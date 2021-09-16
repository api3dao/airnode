import * as ethers from 'ethers';
import * as logger from '../utils/logger';

export function validateMnemonic(mnemonic: string) {
  logger.debug('Validating mnemonic');
  try {
    ethers.Wallet.fromMnemonic(mnemonic);
  } catch {
    return false;
  }
  return true;
}

export function deriveAirnodeAddress(mnemonic: string) {
  logger.debug('Deriving airnode wallet from mnemonic');
  const airnodeWallet = ethers.Wallet.fromMnemonic(mnemonic);
  return airnodeWallet.address;
}

export function deriveXpub(mnemonic: string) {
  logger.debug('Deriving xpub from mnemonic');
  const hdNode = ethers.utils.HDNode.fromMnemonic(mnemonic);
  return hdNode.neuter().extendedKey;
}

export function shortenAirnodeAddress(airnodeAddress: string) {
  logger.debug('Shortening Airnode Address');
  try {
    ethers.utils.getAddress(airnodeAddress);
  } catch {
    throw new Error('airnodeAddress is not a valid hex string');
  }
  // NOTE: AWS doesn't allow uppercase letters in S3 bucket and lambda function names
  return airnodeAddress.substring(2, 9).toLowerCase();
}
