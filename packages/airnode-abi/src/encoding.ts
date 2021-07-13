import { ethers } from 'ethers';
import flatMap from 'lodash/flatMap';
import { PARAMETER_SHORT_TYPES } from './utils';
import { ABIParameterType, ABIParameterTypeShort, InputParameter } from './types';

type TransformationReference = {
  readonly [key: string]: (value: any) => string;
};

// Certain types need to be encoded/transformed before ABI encoding happens
const TRANSFORMATIONS: TransformationReference = {
  bytes32: ethers.utils.formatBytes32String,
};

function buildSchemaHeader(types: ABIParameterType[]): string {
  const allShortTypes = Object.keys(PARAMETER_SHORT_TYPES);

  // Shorten all selected types with the corresponding "short" type
  // i.e. 'address' types get set as simply 'a' and 'bytes32' becomes
  // simply 'b' etc
  const selectedShortTypes = types.reduce((acc: string[], type) => {
    const shortType = allShortTypes.find((st) => PARAMETER_SHORT_TYPES[st as ABIParameterTypeShort] === type);
    return [...acc, shortType!];
  }, []);

  // '1' must be the first character as it indicates the version
  return `1${selectedShortTypes.join('')}`;
}

function buildNameValuePairs(parameters: InputParameter[]): string[] {
  return flatMap(parameters, (parameter) => {
    const { name, value, type } = parameter;
    const transform = TRANSFORMATIONS[type];
    const encodedName = ethers.utils.formatBytes32String(name!);
    // If the type does not need to be transformed, return it as is
    if (!transform) {
      return [encodedName, value];
    }
    const encodedValue = transform(value);
    return [encodedName, encodedValue];
  });
}

export function encode(parameters: InputParameter[]): string {
  const types = parameters.map((parameter) => parameter.type) as ABIParameterType[];

  // Each parameter name is represented by a `bytes32` string. The value
  // types are what the user provides
  const nameTypePairs = flatMap(types, (type) => ['bytes32', type]);

  // The first type is always a bytes32 as it represents the schema header
  const allTypes = ['bytes32', ...nameTypePairs];

  // Build the schema which includes the version and the abbreviated list of parameters
  const schemaHeader = buildSchemaHeader(types as ABIParameterType[]);
  const encodedHeader = ethers.utils.formatBytes32String(schemaHeader);

  // Map and encode each name/value pair where necessary
  const flatNameValues = buildNameValuePairs(parameters);

  // The schema header is always the first value to be encoded
  const allValues = [encodedHeader, ...flatNameValues];

  const encoder = new ethers.utils.AbiCoder();
  return encoder.encode(allTypes, allValues);
}
