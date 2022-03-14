import { BigNumber, ethers } from 'ethers';
import { PromiseOptions } from '../../promises';

export interface GasTarget {
  maxPriorityFeePerGas?: BigNumber;
  maxFeePerGas?: BigNumber;
  gasPrice?: BigNumber;
}

export interface PriorityFee {
  value: number;
  unit?: 'wei' | 'kwei' | 'mwei' | 'gwei' | 'szabo' | 'finney' | 'ether';
}

export interface ChainOptions {
  txType: 'legacy' | 'eip1559';
  baseFeeMultiplier?: number;
  priorityFee?: PriorityFee;
  promiseOptions?: PromiseOptions;
}

export interface FetchOptions {
  provider: ethers.providers.JsonRpcProvider | ethers.providers.Provider;
  chainOptions: ChainOptions;
}
