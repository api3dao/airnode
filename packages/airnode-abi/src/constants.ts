import { ValueOf, TypeTransformation } from './types';

// Upper case letters refer to dynamically sized types, lower case letters refer to statically sized types
export const PARAMETER_SHORT_TYPES = {
  B: 'bytes',
  b: 'bytes32',
  S: 'string',
  s: 'string32', // This is not officially supported type in solidity and we use bytes32 on chain instead
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
