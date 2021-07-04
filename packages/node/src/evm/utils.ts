import { ethers } from 'ethers';

export function gweiToWei(gwei: string) {
  return ethers.utils.parseUnits(gwei, 'gwei');
}

export function weiToGwei(wei: ethers.BigNumber) {
  return ethers.utils.formatUnits(wei, 'gwei');
}

export function weiToBigNumber(wei: string) {
  return ethers.BigNumber.from(wei);
}

// eslint-disable-next-line functional/prefer-readonly-type
export function sortBigNumbers(bigNumbers: ethers.BigNumber[]) {
  // Puts the highest BigNumber first
  return bigNumbers.sort((a, b) => (a.gte(b) ? -1 : 1));
}
