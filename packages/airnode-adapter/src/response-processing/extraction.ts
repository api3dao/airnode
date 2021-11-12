import isUndefined from 'lodash/isUndefined';
import * as casting from './casting';
import * as encoding from './encoding';
import { parseArrayType, isNumericType, applyToArrayRecursively } from './array-type';
import { ReservedParameters, ValueType } from '../types';

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
    // eslint-disable-next-line functional/no-try-statement
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

export function splitReservedParameters(parameters: ReservedParameters): ReservedParameters[] {
  return [parameters];
}

function extractAndEncodeSingleResponse(data: unknown, parameters: ReservedParameters) {
  const rawValue = extractValue(data, parameters._path);
  const value = casting.castValue(rawValue, parameters._type);

  const parsedArrayType = parseArrayType(parameters._type);
  const type = parsedArrayType?.baseType ?? parameters._type;
  if (isNumericType(type)) {
    const multipledValue = parsedArrayType
      ? (applyToArrayRecursively(value, parsedArrayType, (num: number) =>
          casting.multiplyValue(num.toString(), parameters._times)
        ) as ValueType)
      : casting.multiplyValue(value.toString(), parameters._times);

    const encodedValue = encoding.encodeValue(multipledValue, parameters._type);
    return { rawValue, value: multipledValue, encodedValue };
  }

  const encodedValue = encoding.encodeValue(value, parameters._type);
  return { rawValue, value, encodedValue };
}

// This function can throw an error in both extraction and encoding
export function extractAndEncodeResponse(data: unknown, parameters: ReservedParameters) {
  const reservedParameters = splitReservedParameters(parameters);
  if (reservedParameters.length > 1) {
    return reservedParameters.map((params) => extractAndEncodeSingleResponse(data, params));
  }

  return extractAndEncodeSingleResponse(data, parameters);
}
