import isArray from 'lodash/isArray';
import isFinite from 'lodash/isFinite';
import isNil from 'lodash/isNil';
import isPlainObject from 'lodash/isPlainObject';
import { ResponseType } from '../types';

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

function castNumber(value: any, type: ResponseType) {
  const specialNumber = SPECIAL_NUMBERS.find((n) => n.value === value);
  if (specialNumber) {
    return specialNumber.result;
  }

  // +value attempts to convert to a number
  if (!isFinite(+value) || value === '' || isNil(value) || isArray(value) || isPlainObject(value)) {
    throw new Error(`Unable to convert: '${JSON.stringify(value)}' to ${type}`);
  }

  const castNumber = Number(value);

  // Catch anything that was missed
  if (!isFinite(castNumber)) {
    throw new Error(`Unable to convert: '${JSON.stringify(value)}' to ${type}`);
  }

  return castNumber;
}

function castBoolean(value: unknown) {
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

function castBytes32(value: any) {
  // Objects convert to "[object Object]" which isn't very useful
  if (isArray(value) || isPlainObject(value)) {
    throw new Error(`Unable to convert: '${JSON.stringify(value)}' to bytes32`);
  }
  return String(value);
}

export function castValue(value: unknown, type: ResponseType) {
  switch (type) {
    case 'int256':
      return castNumber(value, type);

    case 'bool':
      return castBoolean(value);

    case 'bytes32':
      return castBytes32(value);
  }
}

export function multiplyValue(value: number, times: number) {
  return value * times;
}
