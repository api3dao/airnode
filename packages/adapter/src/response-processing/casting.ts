import isArray from 'lodash/isArray';
import isFinite from 'lodash/isFinite';
import isNil from 'lodash/isNil';
import isPlainObject from 'lodash/isPlainObject';
import BigNumber from 'bignumber.js';
import { ResponseType, ValueType } from '../types';

interface SpecialNumber {
  result: number;
  value: any;
}

// Any extra values that do not convert to numbers simply
const SPECIAL_NUMBERS: SpecialNumber[] = [
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

function castBytes32(value: any): string {
  // Objects convert to "[object Object]" which isn't very useful
  if (isArray(value) || isPlainObject(value)) {
    throw new Error(`Unable to convert: '${JSON.stringify(value)}' to bytes32`);
  }
  return String(value);
}

export function castValue(value: unknown, type: ResponseType): ValueType {
  switch (type) {
    case 'uint256':
    case 'int256':
      return castNumber(value, type);

    case 'bool':
      return castBoolean(value);

    case 'bytes32':
      return castBytes32(value);
  }
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
