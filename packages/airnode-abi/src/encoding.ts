import { ethers } from 'ethers';
import flatMap from 'lodash/flatMap';
import { ParameterType, ParameterTypeShort, PARAMETER_SHORT_TYPES, TYPE_TRANSFORMATIONS } from './constants';
import { InputParameter, ValueTransformation } from './types';

const VERSION = '1';

// Certain types need to be encoded/transformed before ABI encoding happens
const VALUE_TRANSFORMATIONS: ValueTransformation = {
  string32: ethers.utils.formatBytes32String,
};

function buildSchemaHeader(types: ParameterType[]): string {
  const allShortTypes = Object.keys(PARAMETER_SHORT_TYPES);

  // Shorten all selected types with the corresponding "short" type
  // i.e. 'address' types get set as simply 'a' and 'bytes32' becomes
  // simply 'b' etc
  const selectedShortTypes = types.reduce((acc: string[], type) => {
    const shortType = allShortTypes.find((st) => PARAMETER_SHORT_TYPES[st as ParameterTypeShort] === type);
    return [...acc, shortType!];
  }, []);

  return `${VERSION}${selectedShortTypes.join('')}`;
}

function buildNameValuePairs(parameters: InputParameter[]): unknown[] {
  return flatMap(parameters, (parameter) => {
    const { name, value, type } = parameter;
    const transform = VALUE_TRANSFORMATIONS[type as ParameterType];
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
  const types = parameters.map((parameter) => parameter.type) as ParameterType[];

  // Each parameter name is represented by a `bytes32` string. The value
  // types are what the user provides
  const nameTypePairs = flatMap(types, (type) => {
    const transformedType = TYPE_TRANSFORMATIONS[type];
    return ['bytes32', transformedType ?? type];
  });

  // The first type is always a bytes32 as it represents the schema header
  const allTypes = ['bytes32', ...nameTypePairs];

  // Build the schema which includes the version and the abbreviated list of parameters
  const schemaHeader = buildSchemaHeader(types as ParameterType[]);
  const encodedHeader = ethers.utils.formatBytes32String(schemaHeader);

  // Map and encode each name/value pair where necessary
  const flatNameValues = buildNameValuePairs(parameters);

  // The schema header is always the first value to be encoded
  const allValues = [encodedHeader, ...flatNameValues];

  const encoder = new ethers.utils.AbiCoder();
  return encoder.encode(allTypes, allValues);
}
