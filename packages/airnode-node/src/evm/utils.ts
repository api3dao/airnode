import { ethers } from 'ethers';
import { goSync } from '@api3/promise-utils';

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

  // Skip the function selector from the returned encoded data
  // and only decode the revert reason string.
  // Function selector is 4 bytes long and that is why we skip
  // the first 2 bytes (0x) and the rest 8 bytes is the function selector
  // return ethers.utils.defaultAbiCoder.decode(['string'], `0x${callData.substring(2 + 4 * 2)}`)[0];
  const goDecode = goSync(
    () => ethers.utils.defaultAbiCoder.decode(['string'], `0x${callData.substring(2 + 4 * 2)}`)[0]
  );
  if (!goDecode.success) return 'No revert string';

  return goDecode.data;
}
