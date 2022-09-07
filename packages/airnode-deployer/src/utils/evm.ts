import * as ethers from 'ethers';
import { goSync } from '@api3/promise-utils';
import { logAndReturnError } from './infrastructure';
import * as logger from '../utils/logger';

export function deriveAirnodeAddress(mnemonic: string) {
  logger.debug('Deriving airnode wallet from mnemonic');
  const airnodeWallet = ethers.Wallet.fromMnemonic(mnemonic);
  return airnodeWallet.address;
}

export function deriveAirnodeXpub(mnemonic: string) {
  logger.debug('Deriving Airnode xpub from mnemonic');
  const airnodeHdNode = ethers.utils.HDNode.fromMnemonic(mnemonic).derivePath("m/44'/60'/0'");
  return airnodeHdNode.neuter().extendedKey;
}

export function shortenAirnodeAddress(airnodeAddress: string) {
  logger.debug('Shortening Airnode Address');

  const goGetAddress = goSync(() => ethers.utils.getAddress(airnodeAddress));
  if (!goGetAddress.success) throw logAndReturnError('"airnodeAddress" is not a valid hex string');

  // NOTE: AWS doesn't allow uppercase letters in S3 bucket and lambda function names
  return airnodeAddress.substring(2, 9).toLowerCase();
}
