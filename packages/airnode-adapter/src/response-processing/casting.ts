import isArray from 'lodash/isArray';
import isPlainObject from 'lodash/isPlainObject';
import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import { goSync } from '@api3/promise-utils';
import { isNumericType, parseArrayType, applyToArrayRecursively } from './array-type';
import { ResponseType, ValueType } from '../types';
import { baseResponseTypes } from '../constants';

interface SpecialNumber {
  readonly result: number;
  readonly value: unknown;
}

// Any extra values that do not convert to numbers simply
const SPECIAL_NUMBERS: readonly SpecialNumber[] = [
  { value: false, result: 0 },
  { value: 'false', result: 0 },
  { value: true, result: 1 },
  { value: 'true', result: 1 },
];

function castNumber(value: unknown): BigNumber {
  const specialNumber = SPECIAL_NUMBERS.find((n) => n.value === value);
  if (specialNumber) {
    return new BigNumber(specialNumber.result);
  }

  // We can't use ethers.js BigNumber.from here as it cannot handle decimals
  const bigNumberValue = new BigNumber(value as any);

  if (!bigNumberValue.isFinite()) throw new Error('Invalid number value');
  return bigNumberValue;
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

// Objects and arrays convert to "[object Object]" which isn't very useful
function assertValueIsNotArrayOrObject(value: unknown) {
  if (isArray(value)) {
    throw new Error(`Value is an array`);
  }

  if (isPlainObject(value)) {
    throw new Error(`Value is an object`);
  }
}

function castString(value: unknown): string {
  assertValueIsNotArrayOrObject(value);

  return String(value);
}

function castAddress(value: unknown): string {
  assertValueIsNotArrayOrObject(value);

  const stringValue = String(value);
  if (!ethers.utils.isAddress(stringValue)) {
    throw new Error(`Invalid address`);
  }
  return stringValue;
}

function castBytesLike(value: unknown): string {
  return ethers.utils.hexlify(String(value));
}

function castString32(value: unknown) {
  assertValueIsNotArrayOrObject(value);

  const strValue = String(value);
  // We can't encode strings longer than 31 characters to bytes32. Ethers needs to keep room for null termination
  return ethers.utils.formatBytes32String(strValue.length > 31 ? strValue.substring(0, 31) : strValue);
}

function createTimestamp() {
  return new BigNumber(Math.floor(Date.now() / 1000)).toString();
}

function isValidType(type: ResponseType) {
  return baseResponseTypes.includes(type as any) || parseArrayType(type) !== null;
}

export function castValue(value: unknown, type: ResponseType): ValueType {
  if (!isValidType(type)) throw new Error(`Invalid type: ${type}`);

  if (isNumericType(type)) {
    const goCast = goSync(() => castNumber(value));
    if (!goCast.success) throw new Error(`Unable to cast value to ${type}`);

    return goCast.data;
  }

  const parsedArrayType = parseArrayType(type);
  if (parsedArrayType) {
    const goApplyToArrayRecursively = goSync(() => applyToArrayRecursively(value, parsedArrayType, castNumber));
    if (!goApplyToArrayRecursively.success) throw new Error(`Unable to cast value to ${type}`);

    return goApplyToArrayRecursively.data as ValueType;
  }

  switch (type) {
    case 'bool': {
      const goCast = goSync(() => castBoolean(value));
      if (!goCast.success) throw new Error(`Unable to cast value to ${type}`);

      return goCast.data;
    }
    case 'bytes32': {
      const goCast = goSync(() => castBytesLike(value));
      if (!goCast.success) throw new Error(`Unable to cast value to ${type}`);

      return goCast.data;
    }
    case 'string': {
      const goCast = goSync(() => castString(value));
      if (!goCast.success) throw new Error(`Unable to cast value to ${type}`);

      return goCast.data;
    }
    case 'address': {
      const goCast = goSync(() => castAddress(value));
      if (!goCast.success) throw new Error(`Unable to cast value to ${type}`);

      return goCast.data;
    }
    case 'bytes': {
      const goCast = goSync(() => castBytesLike(value));
      if (!goCast.success) throw new Error(`Unable to cast value to ${type}`);

      return goCast.data;
    }
    case 'string32': {
      const goCast = goSync(() => castString32(value));
      if (!goCast.success) throw new Error(`Unable to cast value to ${type}`);

      return goCast.data;
    }
    case 'timestamp': {
      const goCast = goSync(createTimestamp);
      if (!goCast.success) throw new Error(`Unable to cast value to ${type}`);

      return goCast.data;
    }
  }

  // NOTE: Should not happen, we should throw on invalid type sooner
  throw new Error('Conversion for the given type is not defined');
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
