import isArray from 'lodash/isArray';
import isFinite from 'lodash/isFinite';
import isNil from 'lodash/isNil';
import isPlainObject from 'lodash/isPlainObject';
import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import { isNumericType, parseArrayType, applyToArrayRecursively } from './array-type';
import { ResponseType, ValueType } from '../types';

interface SpecialNumber {
  readonly result: number;
  readonly value: any;
}

// Any extra values that do not convert to numbers simply
const SPECIAL_NUMBERS: readonly SpecialNumber[] = [
  { value: false, result: 0 },
  { value: 'false', result: 0 },
  { value: true, result: 1 },
  { value: 'true', result: 1 },
];

function castNumber(value: any, type: ResponseType): BigNumber {
  const specialNumber = SPECIAL_NUMBERS.find((n) => n.value === value);
  if (specialNumber) {
    return new BigNumber(specialNumber.result);
  }

  // +value attempts to convert to a number
  if (!isFinite(+value) || value === '' || isNil(value) || isArray(value) || isPlainObject(value)) {
    throw new Error(`Unable to convert: '${JSON.stringify(value)}' to ${type}`);
  }

  // We can't use ethers.js BigNumber.from here as it cannot handle decimals
  // eslint-disable-next-line functional/no-try-statement
  try {
    return new BigNumber(value);
  } catch (e) {
    throw new Error(`Unable to convert: '${JSON.stringify(value)}' to ${type}`);
  }
}

function castBoolean(value: unknown): boolean {
  switch (value) {
    case 0:
    case '0':
    case false:
    case 'false':
    case undefined:
    case null:
      return false;

    default:
      return true;
  }
}

function castStringLike(value: any, target: 'string' | 'bytes32'): string {
  // Objects convert to "[object Object]" which isn't very useful
  if (isArray(value) || isPlainObject(value)) {
    throw new Error(`Unable to convert: '${JSON.stringify(value)}' to ${target}`);
  }
  return String(value);
}

function castAddress(value: any): string {
  // Objects convert to "[object Object]" which isn't very useful
  if (isArray(value) || isPlainObject(value)) {
    throw new Error(`Unable to convert: '${JSON.stringify(value)}' to address`);
  }

  const stringValue = String(value);
  if (!ethers.utils.isAddress(stringValue)) {
    throw new Error(`Unable to convert: '${stringValue}' to address`);
  }
  return stringValue;
}

function castHexString(value: any): string {
  // Objects convert to "[object Object]" which isn't very useful
  // also checks if the value is nil
  if (isArray(value) || isPlainObject(value) || isNil(value)) {
    throw new Error(`Unable to convert: '${JSON.stringify(value)}' to bytes`);
  }
  return ethers.utils.hexlify(value);
}

export function castValue(value: unknown, type: ResponseType): ValueType {
  if (isNumericType(type)) return castNumber(value, type);

  const parsedArrayType = parseArrayType(type);
  if (parsedArrayType) return applyToArrayRecursively(value, parsedArrayType, castNumber) as ValueType;

  switch (type) {
    case 'bool':
      return castBoolean(value);
    case 'bytes32':
      return castStringLike(value, 'bytes32');
    case 'string':
      return castStringLike(value, 'string');
    case 'address':
      return castAddress(value);
    case 'bytes':
      return castHexString(value);
  }

  throw new Error(`Invalid type: ${type}`);
}

export function multiplyValue(value: string | BigNumber, times?: string | BigNumber): string {
  if (!times) {
    const stringifiedNumber = bigNumberToString(new BigNumber(value));
    return floorStringifiedNumber(stringifiedNumber);
  }
  const bigNumProduct = new BigNumber(value).times(new BigNumber(times));
  const stringProduct = bigNumberToString(bigNumProduct);
  return floorStringifiedNumber(stringProduct);
}

export function bigNumberToString(value: BigNumber): string {
  // https://blog.enuma.io/update/2019/01/31/safe-use-of-bignumber.js.html
  // .toString(10) removes the exponential notation, if it is present
  return value.toString(10);
}

export function floorStringifiedNumber(value: string): string {
  // Ethers BigNumber can't handle decimals so we convert to a string and if
  // there are still any remaining decimals, remove them (floor the result)
  return value.split('.')[0];
}
