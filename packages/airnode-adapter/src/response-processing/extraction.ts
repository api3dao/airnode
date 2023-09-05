import isUndefined from 'lodash/isUndefined';
import range from 'lodash/range';
import { ethers } from 'ethers';
import { goSync } from '@api3/promise-utils';
import { castValue, multiplyValue } from './casting';
import { parseArrayType, isNumericType, applyToArrayRecursively } from './array-type';
import { encodeMultipleValues, encodeValue } from './encoding';
import {
  ESCAPE_CHARACTER,
  MAX_ENCODED_RESPONSE_SIZE,
  MULTIPLE_PARAMETERS_DELIMETER,
  PATH_DELIMETER,
} from '../constants';
import {
  ResponseReservedParameters,
  ValueType,
  ExtractedAndEncodedResponse,
  ReservedParametersDelimeter,
} from '../types';

export function unescape(value: string, delimeter: ReservedParametersDelimeter) {
  const escapedEscapeCharacter = ESCAPE_CHARACTER.repeat(2);
  // We need to escape the delimeter, because it can be a '.'
  const escapedDelimeter = `${ESCAPE_CHARACTER}${delimeter}`;
  return value.replace(new RegExp(`${escapedEscapeCharacter}(${escapedDelimeter})`, 'g'), '$1');
}

export function escapeAwareSplit(value: string, delimeter: ReservedParametersDelimeter) {
  const escapedEscapeCharacter = ESCAPE_CHARACTER.repeat(2);
  // We need to escape the delimeter, because it can be a '.'
  const escapedDelimeter = `${ESCAPE_CHARACTER}${delimeter}`;
  // Inspired by: https://stackoverflow.com/a/14334054
  const matchResult = value.match(new RegExp(`(${escapedEscapeCharacter}.|[^${escapedDelimeter}])*`, 'g'));

  if (!matchResult) return [value].map((val) => unescape(val, delimeter));
  return matchResult
    .filter((token, index, result) => {
      const previousNotEmpty = index !== 0 && result[index - 1].length > 0;
      const shouldBeRemoved = token.length === 0 && previousNotEmpty;

      return !shouldBeRemoved;
    })
    .map((val) => unescape(val, delimeter));
}

export function getRawValue(data: any, path?: string, defaultValue?: any) {
  // Some APIs return a simple value not in an object or array, like
  // a string, number or boolean. If this is the case, the user can
  // choose to omit the path which means that the adapter does not
  // need to do any "extraction".
  if (!path) {
    return data;
  }

  return escapeAwareSplit(path, PATH_DELIMETER).reduce((acc, segment) => {
    const goNextValue = goSync(() => acc[segment]);
    if (!goNextValue.success) return defaultValue;

    return goNextValue.data === undefined ? defaultValue : goNextValue.data;
  }, data);
}

export function extractValue(data: unknown, path?: string) {
  const rawValue = getRawValue(data, path);

  if (isUndefined(rawValue)) {
    throw new Error(`Unable to find value at path: '${path}'`);
  }

  return rawValue;
}

export function splitReservedParameters(parameters: ResponseReservedParameters): ResponseReservedParameters[] {
  const splitByDelimeter = (name: keyof ResponseReservedParameters) => {
    return {
      name,
      splitResult: parameters[name] ? escapeAwareSplit(parameters[name]!, MULTIPLE_PARAMETERS_DELIMETER) : undefined,
    };
  };

  const types = splitByDelimeter('_type');
  const paths = splitByDelimeter('_path');
  const timeses = splitByDelimeter('_times');

  // Check that all of the parsed arrays have the same length or are undefined
  const splitParams = [types, paths, timeses] as const;
  const typesLength = types.splitResult!.length;
  splitParams.forEach((split) => {
    if (split.splitResult && split.splitResult.length !== typesLength) {
      throw new Error(
        `Unexpected number of parsed reserved parameters. Number of "_types" parameters = ${typesLength}, but "${split.name}" has only ${split.splitResult.length}`
      );
    }
  });

  const reservedParameters: ResponseReservedParameters[] = range(typesLength).map((i) =>
    splitParams.reduce(
      (acc, param) => {
        if (!param.splitResult) return acc;
        return { ...acc, [param.name]: param.splitResult[i] };
      },
      {} as any as ResponseReservedParameters
    )
  );

  return reservedParameters;
}

function extractSingleResponse(data: unknown, parameters: ResponseReservedParameters) {
  const parsedArrayType = parseArrayType(parameters._type);
  const type = parsedArrayType?.baseType ?? parameters._type;

  if (!isNumericType(type) && parameters._times) {
    throw new Error(`Parameter "_times" can only be used with numeric types, but "_type" was "${type}"`);
  }
  if (type === 'timestamp' && parameters._path) {
    throw new Error(
      `Parameter "_path" must be empty string or undefined when "_type" is "timestamp", but it was "${parameters._path}"`
    );
  }

  const extracted = extractValue(data, parameters._path);
  const value = castValue(extracted, parameters._type);

  if (isNumericType(type)) {
    const multipledValue = parsedArrayType
      ? (applyToArrayRecursively(value, parsedArrayType, (num: number) =>
          multiplyValue(num.toString(), parameters._times)
        ) as ValueType)
      : multiplyValue(value.toString(), parameters._times);

    return multipledValue;
  }

  return value;
}

export function exceedsMaximumEncodedResponseSize(encodedValue: string) {
  const encodedBytesLength = ethers.utils.arrayify(encodedValue).byteLength;
  return encodedBytesLength > MAX_ENCODED_RESPONSE_SIZE;
}

export function extractAndEncodeResponse(
  data: unknown,
  parameters: ResponseReservedParameters
): ExtractedAndEncodedResponse {
  const reservedParameters = splitReservedParameters(parameters);
  if (reservedParameters.length > 1) {
    const extractedValues = reservedParameters.map((params) => extractSingleResponse(data, params));
    const encodedValue = encodeMultipleValues(
      extractedValues,
      reservedParameters.map((param) => param._type)
    );

    return { rawValue: data, encodedValue, values: extractedValues };
  }

  const extractedValue = extractSingleResponse(data, parameters);
  const encodedValue = encodeValue(extractedValue, parameters._type);

  if (exceedsMaximumEncodedResponseSize(encodedValue)) {
    throw new Error(`Encoded value exceeds the maximum allowed size (${MAX_ENCODED_RESPONSE_SIZE} bytes)`);
  }

  return { rawValue: data, encodedValue, values: [extractedValue] };
}
