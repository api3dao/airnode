import { ethers } from 'ethers';
import { parseArrayType } from './array-type';
import { ResponseType, ValueType } from '../types';

function convertUnsignedInteger(value: string) {
  return ethers.utils.defaultAbiCoder.encode(['uint256'], [value]);
}

function convertSignedInteger(value: string) {
  return ethers.utils.defaultAbiCoder.encode(['int256'], [value]);
}

function convertBool(value: boolean) {
  return ethers.utils.defaultAbiCoder.encode(['bool'], [value]);
}

function convertBytes32(value: string) {
  // We can't encode strings longer than 31 characters to bytes32.
  // Ethers need to keep room for null termination
  const trimmedValue = value.length > 31 ? value.substring(0, 31) : value;

  const bytes32String = ethers.utils.formatBytes32String(trimmedValue);
  return ethers.utils.defaultAbiCoder.encode(['bytes32'], [bytes32String]);
}

function convertAddress(value: string) {
  return ethers.utils.defaultAbiCoder.encode(['address'], [value]);
}

function convertBytes(value: string | ArrayLike<number>) {
  return ethers.utils.defaultAbiCoder.encode(['bytes'], [value]);
}

function convertString(value: string) {
  return ethers.utils.defaultAbiCoder.encode(['string'], [value]);
}

function convertArray(value: ValueType, type: ResponseType): string {
  return ethers.utils.defaultAbiCoder.encode([type], [value]);
}

export function encodeValue(value: ValueType, type: ResponseType): string {
  const parsedArrayType = parseArrayType(type);
  if (parsedArrayType) {
    return convertArray(value, type);
  }

  switch (type) {
    case 'uint256':
      return convertUnsignedInteger(value as string);
    case 'int256':
      return convertSignedInteger(value as string);
    case 'bool':
      return convertBool(value as boolean);
    case 'bytes32':
      return convertBytes32(value as string);
    case 'address':
      return convertAddress(value as string);
    case 'bytes':
      return convertBytes(value as string);
    case 'string':
      return convertString(value as string);
  }

  throw new Error(`Unknown type: ${type}`);
}
