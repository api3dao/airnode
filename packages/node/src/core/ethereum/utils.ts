import { ethers } from 'ethers';
import * as logger from '../utils/logger';

export function logProviderJSON(name: string, level: logger.LogLevel, message: string) {
  logger.logJSON(level, `[${name}] ${message}`);
}

export function gweiToWei(gwei: string) {
  return ethers.utils.parseUnits(gwei, 'gwei');
}

export function weiToGwei(wei: ethers.BigNumber) {
  return ethers.utils.formatUnits(wei, 'gwei');
}

export function weiToBigNumber(wei: string) {
  return ethers.BigNumber.from(wei);
}

export function sortBigNumbers(bigNumbers: ethers.BigNumber[]) {
  // Puts the highest BigNumber first
  return bigNumbers.sort((a, b) => (a.gte(b) ? -1 : 1));
}
