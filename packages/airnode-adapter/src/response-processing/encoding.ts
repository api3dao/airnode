import { ethers } from 'ethers';
import { ResponseType, ValueType } from '../types';

export function encodeValue(value: ValueType, type: ResponseType): string {
  if (type === 'bytes32') return ethers.utils.formatBytes32String(value as string);

  return ethers.utils.defaultAbiCoder.encode([type], [value]);
}
