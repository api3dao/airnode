import get from 'lodash/get';
import isUndefined from 'lodash/isUndefined';
import * as caster from './caster';
import { Response, ResponseParameters, ResponseType } from '../types';

export function isNumberType(type: ResponseType) {
  return type === 'uint256' || type === 'int256';
}

export function extractResponseValue(response: Response, parameters: ResponseParameters) {
  const { path, times, type } = parameters;
  const rawValue = get(response.data, path);

  if (isUndefined(rawValue)) {
    throw new Error(`Unable to find value from path: '${path}'`);
  }

  let value = caster.castValue(rawValue, type);

  if (times && isNumberType(type)) {
    value = caster.multiplyValue(value, times);
  }

  return value;
}
