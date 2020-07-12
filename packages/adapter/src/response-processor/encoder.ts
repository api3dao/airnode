import { ethers } from 'ethers';

export function convertNumberToBytes32(value: number) {
  const bigNumber = ethers.BigNumber.from(value);

  // Ethers doesn't keep the number in two's complement form but we need this to
  // be able to handle negative integers
  const twosComplementBigNumber = bigNumber.toTwos(256);
  const numberInHexStringForm = twosComplementBigNumber.toHexString();

  // We only need to do this if value is positive but it makes no change if value is negative
  // because calling .toTwos() on a negative number pads it
  const paddedNumberInHexStringForm = ethers.utils.hexZeroPad(numberInHexStringForm, 32);
  return paddedNumberInHexStringForm;
}

export function convertStringToBytes32(value: string) {
  // We can't encode strings longer than 31 characters to bytes32.
  // Ethers need to keep room for null termination
  if (value.length > 31) {
    value = value.substring(0, 31);
  }
  return ethers.utils.formatBytes32String(value);
}

export function convertBoolToBytes32(value: boolean) {
  const bytesRepresentation = ethers.utils.hexValue(value ? 1 : 0);
  const paddedBytesRepresentation = ethers.utils.hexZeroPad(bytesRepresentation, 32);
  return paddedBytesRepresentation;
}
