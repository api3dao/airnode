import { ethers } from 'ethers';
import { ResponseType, ValueType } from '../types';

export function encodeValue(value: ValueType, type: ResponseType): string {
  return ethers.utils.defaultAbiCoder.encode([type], [value]);
}
