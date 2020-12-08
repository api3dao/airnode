import { ethers } from 'ethers';
import flatMap from 'lodash/flatMap';
import flatten from 'lodash/flatten';
import zip from 'lodash/zip';
import { ABIParameterType } from '../../types';
import { PARAMETER_TYPE_ENCODINGS } from '../utils';

type TransformationFunction = (value: any) => InputValue;

type TransformationReference = {
  [key in ABIParameterType]: TransformationFunction | null;
};

type InputValue = string | ethers.BigNumber;

// Certain types need to be encoded/transformed before ABI encoding happens
const TRANSFORMATIONS: TransformationReference = {
  bytes: ethers.utils.formatBytes32String,
  bytes32: ethers.utils.formatBytes32String,
  string: null,
  address: null,
  int256: null,
  uint256: null,
};

function buildSchemaHeader(types: ABIParameterType[]): string {
  const allShortTypes = Object.keys(PARAMETER_TYPE_ENCODINGS);

  // Shorten all selected types with the corresponding "short" type
  // i.e. 'address' types get set as simply 'a' and 'bytes32' becomes
  // simply 'b' etc
  const selectedShortTypes = types.reduce((acc: string[], type) => {
    const shortType = allShortTypes.find((st) => PARAMETER_TYPE_ENCODINGS[st] === type);
    return [...acc, shortType!];
  }, []);

  // '1' must be the first character as it indicates the version
  return `1${selectedShortTypes.join('')}`;
}

function encodeNameValuePairs(types: ABIParameterType[], namesValuePairs: [string, InputValue][]) {
  return namesValuePairs.map((pair, index) => {
    const type = types[index];
    const transform = TRANSFORMATIONS[type];
    const [name, value] = pair;
    const encodedName = ethers.utils.formatBytes32String(name!);
    // If the type does not need to be transformed, return it as is
    if (!transform) {
      return [encodedName, value];
    }
    const encodedValue = transform(value);
    return [encodedName, encodedValue];
  });
}

export function encode(types: string[], names: string[], values: InputValue[]): string {
  // Each parameter name is represented by a `bytes32` string. The value
  // types are what the user provides
  const nameTypes = flatMap(types, (type) => ['bytes32', type]);

  // The first type is always a bytes32 as it represents the schema header
  const allTypes = ['bytes32', ...nameTypes];

  // Build the schema which includes the version and the abbreviated list of parameters
  const schemaHeader = buildSchemaHeader(types as ABIParameterType[]);
  const encodedHeader = ethers.utils.formatBytes32String(schemaHeader);

  // zip() pairs each element of the first array with the corresponding element
  // of the second array.
  const nameValuePairs = zip(names, values) as [string, InputValue][];

  // Encode each name/value pair where necessary
  const encodedNameValuePairs = encodeNameValuePairs(types as ABIParameterType[], nameValuePairs);

  // We need to flatten all pairs out into a single array
  const flatNameValues = flatten(encodedNameValuePairs);

  // The schema header is always the first value to be encoded
  const allValues = [encodedHeader, ...flatNameValues];

  const encoder = new ethers.utils.AbiCoder();
  return encoder.encode(allTypes, allValues);
}
