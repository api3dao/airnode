import get from 'lodash/get';
import isUndefined from 'lodash/isUndefined';
import * as caster from './caster';
import { ResponseParameters, ResponseType } from '../types';

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

export function extractResponse(data: unknown, parameters: ResponseParameters) {
  const { path, times, type } = parameters;
  const rawValue = extractRawValue(data, path);

  if (isUndefined(rawValue)) {
    throw new Error(`Unable to find value from path: '${path}'`);
  }

  let value = caster.castValue(rawValue, type);

  if (times && typeof value === 'number' && isNumberType(type)) {
    value = caster.multiplyValue(value, times);
  }

  return value;
}
