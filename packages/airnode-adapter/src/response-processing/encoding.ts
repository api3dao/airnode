import { ethers } from 'ethers';
import { goSync } from '@api3/promise-utils';
import { artificialTypes } from '../constants';
import { ResponseType, ValueType } from '../types';

type ArtificialTypeMapping = {
  readonly [key in (typeof artificialTypes)[number]]: string;
};

const artificialTypeToSolidityType: ArtificialTypeMapping = {
  string32: 'bytes32',
  timestamp: 'uint256',
};

export function getSolidityType(type: ResponseType) {
  return artificialTypes.reduce(
    (result, currentType) =>
      result.replace(currentType, artificialTypeToSolidityType[currentType as keyof ArtificialTypeMapping]),
    type
  );
}

export function encodeValue(value: ValueType, type: ResponseType): string {
  const solidityType = getSolidityType(type);

  const goEncode = goSync(() => ethers.utils.defaultAbiCoder.encode([solidityType], [value]));
  if (!goEncode.success) throw new Error(goEncode.error.message);

  return goEncode.data;
}

export function encodeMultipleValues(values: ValueType[], types: ResponseType[]): string {
  const solidityTypes = types.map(getSolidityType);

  const goEncode = goSync(() => ethers.utils.defaultAbiCoder.encode(solidityTypes, values));
  if (!goEncode.success) throw new Error(goEncode.error.message);

  return goEncode.data;
}
