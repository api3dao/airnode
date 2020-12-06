import { ethers } from 'ethers';
import flatMap from 'lodash/flatMap';
import flatten from 'lodash/flatten';
import zip from 'lodash/zip';
import { ABIParameterType } from '../../types';
import { PARAMETER_TYPE_ENCODINGS } from '../utils';

function buildSchemaHeader(types: ABIParameterType[]): string {
  const allShortTypes = Object.keys(PARAMETER_TYPE_ENCODINGS);

  const selectedShortTypes = types.reduce((acc: string[], type) => {
    const shortType = allShortTypes.find((st) => PARAMETER_TYPE_ENCODINGS[st] === type);
    if (!shortType) {
      throw new Error(`Unknown encoding type: ${type}`);
    }
    return [...acc, shortType];
  }, []);

  return `1${selectedShortTypes.join('')}`;
}

export function encode(types: ABIParameterType[], names: string[], values: string[]): string {
  // TODO:
  // if (types.length !== names.length !== values.length) {
  //   throw new Error(`Input arrays are not the same length`);
  // }

  // Each parameter name is represented by a `bytes32` string. The value
  // types are what the user provides
  const nameTypes = flatMap(types, (type) => ['bytes32', type]);

  // The first type is always a bytes32 as it represents the schema header
  const allTypes = ['bytes32', ...nameTypes];

  // Build the schema which includes the version and the abbreviated list of parameters
  const schemaHeader = buildSchemaHeader(types);

  // zip() pairs each element of the first array with the corresponding element
  // of the second array. We need to flatten these pairs into a single array
  const namesWithValues = flatten(zip(names, values));

  // The schema header is always the first value to be encoded
  const allValues = [schemaHeader, ...namesWithValues];

  // We need to format all input values as bytes32 strings before encoding
  const encodedValues = allValues.map((v) => ethers.utils.formatBytes32String(v!));

  const encoder = new ethers.utils.AbiCoder();
  return encoder.encode(allTypes, encodedValues);
}
