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

export function sortBigNumbers(bigNumbers: ethers.BigNumber[]) {
  // Puts the highest BigNumber first
  return bigNumbers.sort((a, b) => (a.gte(b) ? -1 : 1));
}

export function decodeRevertString(callData: string) {
  // Refer to https://ethereum.stackexchange.com/a/83577
  // eslint-disable-next-line functional/no-try-statement
  try {
    // Skip the signature, only get the revert string
    return ethers.utils.defaultAbiCoder.decode(['string'], `0x${callData.substring(2 + 4 * 2)}`)[0];
  } catch {
    return 'No revert string';
  }
}
