import { ethers } from 'ethers';
import { artificialTypes } from '../constants';
import { ResponseType, ValueType } from '../types';

type ArtificialTypeMapping = {
  readonly [key in typeof artificialTypes[number]]: string;
};

const artificialTypeToSolidityType: ArtificialTypeMapping = {
  string32: 'bytes32',
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

  return ethers.utils.defaultAbiCoder.encode([solidityType], [value]);
}

export function encodeMultipleValues(values: ValueType[], types: ResponseType[]): string {
  const solidityTypes = types.map((type) => getSolidityType(type));

  return ethers.utils.defaultAbiCoder.encode(solidityTypes, values);
}
