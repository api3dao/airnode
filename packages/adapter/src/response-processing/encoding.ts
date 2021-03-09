import { ethers } from 'ethers';
import { ResponseType, ValueType } from '../types';

export function convertUnsignedIntegerToBytes32(value: string) {
  return ethers.utils.defaultAbiCoder.encode(['uint256'], [value]);
}

export function convertSignedIntegerToBytes32(value: string) {
  return ethers.utils.defaultAbiCoder.encode(['int256'], [value]);
}

export function convertStringToBytes32(value: string) {
  // We can't encode strings longer than 31 characters to bytes32.
  // Ethers need to keep room for null termination
  if (value.length > 31) {
    value = value.substring(0, 31);
  }
  const bytes32String = ethers.utils.formatBytes32String(value);
  return ethers.utils.defaultAbiCoder.encode(['bytes32'], [bytes32String]);
}

export function convertBoolToBytes32(value: boolean) {
  return ethers.utils.defaultAbiCoder.encode(['bool'], [value]);
}

export function encodeValue(value: ValueType, type: ResponseType) {
  switch (type) {
    case 'uint256':
      return convertUnsignedIntegerToBytes32(value as string);

    case 'int256':
      return convertSignedIntegerToBytes32(value as string);

    case 'bool':
      return convertBoolToBytes32(value as boolean);

    case 'bytes32':
      return convertStringToBytes32(value as string);
  }
}
