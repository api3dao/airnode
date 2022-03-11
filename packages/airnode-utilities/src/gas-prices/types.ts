import { BigNumber } from 'ethers';

export interface GasTarget {
  readonly maxPriorityFeePerGas?: BigNumber;
  readonly maxFeePerGas?: BigNumber;
  readonly gasPrice?: BigNumber;
}

export interface PriorityFee {
  readonly value: number;
  readonly unit?: 'wei' | 'kwei' | 'mwei' | 'gwei' | 'szabo' | 'finney' | 'ether';
}

export interface ChainOptions {
  readonly txType: 'legacy' | 'eip1559';
  readonly baseFeeMultiplier?: number;
  readonly priorityFee?: PriorityFee;
}
