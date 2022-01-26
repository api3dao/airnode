import { ValueOf, TypeTransformation } from './types';

// Upper case letters refer to dynamically sized types, lower case letters refer to statically sized types
export const PARAMETER_SHORT_TYPES = {
  B: 'bytes',
  b: 'bytes32',
  S: 'string',
  // Type "string32" is not supported in solidity and we use bytes32 on chain instead. We need to create this
  // artificially made up type so that users can decide if they want their data encoded as short string or as raw bytes
  // value.
  s: 'string32',
  a: 'address',
  i: 'int256',
  u: 'uint256',
  f: 'bool',
} as const;

export type ParameterType = ValueOf<typeof PARAMETER_SHORT_TYPES>;
export type ParameterTypeShort = keyof typeof PARAMETER_SHORT_TYPES;

// Type mapping is common for both encoding/decoding
export const TYPE_TRANSFORMATIONS: TypeTransformation = {
  string32: 'bytes32',
};
