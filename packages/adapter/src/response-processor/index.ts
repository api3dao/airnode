import get from 'lodash/get';
import isUndefined from 'lodash/isUndefined';
import * as caster from './caster';
import * as encoder from './encoder';
import { ResponseType, ValueType } from '../types';

function extractRawValue(data: unknown, path?: string) {
  // Some APIs return a simple value not in an object or array, like
  // a string, number or boolean. If this is the case, the user can
  // choose to omit the path which means that the adapter does not
  // need to do any "extraction".
  if (!path) {
    return data;
  }
  return get(data, path);
}

export function isNumberType(type: ResponseType) {
  return type === 'int256';
}

export function processByExtracting(data: unknown, path?: string) {
  const rawValue = extractRawValue(data, path);

  if (isUndefined(rawValue)) {
    throw new Error(`Unable to find value from path: '${path}'`);
  }

  return rawValue;
}

export function processByCasting(rawValue: unknown, type: ResponseType) {
  return caster.castValue(rawValue, type);
}

export function processByMultiplying(value: number | string, times?: number | string): string {
  if (!times) {
    // Remove any trailing decimals if they exist (floor the number)
    return value.toString().split('.')[0];
  }
  return caster.multiplyValue(value, times);
}

export function processByEncoding(value: ValueType, type: ResponseType) {
  // NOTE: value should be in the matching type at this point
  switch (type) {
    case 'int256':
      return encoder.convertNumberToBytes32(value as string);

    case 'bool':
      return encoder.convertBoolToBytes32(value as boolean);

    case 'bytes32':
      return encoder.convertStringToBytes32(value as string);
  }
}
