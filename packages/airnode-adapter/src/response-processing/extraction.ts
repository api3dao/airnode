import { range, isUndefined } from 'lodash';
import { castValue, multiplyValue } from './casting';
import { parseArrayType, isNumericType, applyToArrayRecursively } from './array-type';
import { encodeMultipleValues, encodeValue } from './encoding';
import { ESCAPE_CHARACTER, MULTIPLE_PARAMETERS_DELIMETER, PATH_DELIMETER } from '../constants';
import { ReservedParameters, ValueType, ExtractedAndEncodedResponse, ReservedParametersDelimeter } from '../types';

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
  const splitByDelimeter = (name: keyof ReservedParameters) => {
    return {
      name,
      splitResult: parameters[name] ? escapeAwareSplit(parameters[name]!, MULTIPLE_PARAMETERS_DELIMETER) : undefined,
    };
  };

  const types = splitByDelimeter('_type');
  const paths = splitByDelimeter('_path');
  const timeses = splitByDelimeter('_times');
  const relayMetadatas = splitByDelimeter('_relay_metadata');

  // Check that all of the parsed arrays have the same length or are undefined
  const splitParams = [types, paths, timeses, relayMetadatas] as const;
  const typesLength = types.splitResult!.length;
  splitParams.forEach((split) => {
    if (split.splitResult && split.splitResult.length !== typesLength) {
      throw new Error(
        `Unexpected number of parsed reserved parameters. Number of "_types" parameters = ${typesLength}, but "${split.name}" has only ${split.splitResult.length}`
      );
    }
  });

  const reservedParameters: ReservedParameters[] = range(typesLength).map((i) =>
    splitParams.reduce((acc, param) => {
      if (!param.splitResult) return acc;

      return { ...acc, [param.name]: param.splitResult[i] };
    }, {} as any as ReservedParameters)
  );

  return reservedParameters;
}

function extractSingleResponse(data: unknown, parameters: ReservedParameters) {
  const extracted = extractValue(data, parameters._path);
  const value = castValue(extracted, parameters._type);

  const parsedArrayType = parseArrayType(parameters._type);
  const type = parsedArrayType?.baseType ?? parameters._type;
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

// This function can throw an error in both extraction and encoding
export function extractAndEncodeResponse(data: unknown, parameters: ReservedParameters): ExtractedAndEncodedResponse {
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
  return { rawValue: data, encodedValue: encodeValue(extractedValue, parameters._type), values: [extractedValue] };
}
