import { ABIParameterType, ABIParameterTypeShort } from './types';

export const PARAMETER_SHORT_TYPES: { readonly [name in ABIParameterTypeShort]: ABIParameterType } = {
  B: 'bytes',
  S: 'string',
  b: 'bool',
  s: 'bytes32',
  a: 'address',
  i: 'int256',
  u: 'uint256',
};
