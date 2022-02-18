import { ethers } from 'ethers';
import { artificialTypes } from '../constants';
import { ResponseType, ValueType } from '../types';

type ArtificialTypeMapping = {
  readonly [key in typeof artificialTypes[number]]: string;
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
  try {
    return ethers.utils.defaultAbiCoder.encode([solidityType], [value]);
  } catch (e) {
    if (e instanceof Error) throw new Error((e as Error).message);
    throw new Error(String(e));
  }
}

export function encodeMultipleValues(values: ValueType[], types: ResponseType[]): string {
  const solidityTypes = types.map(getSolidityType);
  try {
    return ethers.utils.defaultAbiCoder.encode(solidityTypes, values);
  } catch (e) {
    if (e instanceof Error) throw new Error((e as Error).message);
    throw new Error(String(e));
  }
}
