import { ABIParameterType, ABIParameterTypeShort } from './types';

export const PARAMETER_SHORT_TYPES: { [name in ABIParameterTypeShort]: ABIParameterType } = {
  B: 'bytes',
  S: 'string',
  a: 'address',
  b: 'bytes32',
  i: 'int256',
  u: 'uint256',
};
