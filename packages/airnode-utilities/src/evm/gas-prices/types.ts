import { BigNumber, ethers } from 'ethers';
import { PromiseOptions } from '../../promises';

export interface GasTarget {
  type: number;
  maxPriorityFeePerGas?: BigNumber;
  maxFeePerGas?: BigNumber;
  gasPrice?: BigNumber;
  gasLimit?: BigNumber;
}

export interface PriorityFee {
  value: number;
  unit?: 'wei' | 'kwei' | 'mwei' | 'gwei' | 'szabo' | 'finney' | 'ether';
}

export type Eip1559ChainOptions = {
  txType: 'eip1559';
  // If not provided, default values will be used instead
  baseFeeMultiplier?: number;
  priorityFee?: PriorityFee;
  fulfillmentGasLimit?: number;
} & PromiseOptions;

export type LegacyChainOptions = {
  txType: 'legacy';
  // If not provided, default values will be used instead
  gasPriceMultiplier?: number;
  fulfillmentGasLimit?: number;
} & PromiseOptions;

export type ChainOptions = LegacyChainOptions | Eip1559ChainOptions;

export interface FetchOptions {
  provider: ethers.providers.Provider;
  chainOptions: ChainOptions;
}
