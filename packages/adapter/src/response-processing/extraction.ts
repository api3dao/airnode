import BigNumber from 'bignumber.js';
import isUndefined from 'lodash/isUndefined';
import * as casting from './casting';
import * as encoding from './encoding';
import { ReservedParameters } from '../types';

export function getRawValue(data: any, path?: string, defaultValue?: any) {
  // Some APIs return a simple value not in an object or array, like
  // a string, number or boolean. If this is the case, the user can
  // choose to omit the path which means that the adapter does not
  // need to do any "extraction".
  if (!path) {
    return data;
  }

  // We could use lodash#get, but it's slow and we want to control the
  // exact behaviour ourselves.
  return path.split('.').reduce((acc, segment) => {
    try {
      const nextValue = acc[segment];
      return nextValue === undefined ? defaultValue : nextValue;
    } catch (e) {
      return defaultValue;
    }
  }, data);
}

export function extractValue(data: unknown, path?: string) {
  const rawValue = getRawValue(data, path);

  if (isUndefined(rawValue)) {
    throw new Error(`Unable to find value from path: '${path}'`);
  }

  return rawValue;
}

export function extractAndEncodeResponse(data: unknown, parameters: ReservedParameters) {
  const rawValue = extractValue(data, parameters._path);
  const value = casting.castValue(rawValue, parameters._type);

  if ((parameters._type === 'uint256' || parameters._type === 'int256') && value instanceof BigNumber) {
    const multipledValue = casting.multiplyValue(value, parameters._times);
    const encodedValue = encoding.encodeValue(multipledValue.toString(), parameters._type);
    return { value: multipledValue, encodedValue };
  }

  const encodedValue = encoding.encodeValue(value, parameters._type);
  return { value, encodedValue };
}
