import { BigNumber, ethers } from 'ethers';
import { GoAsyncOptions } from '@api3/promise-utils';

export interface GasTarget {
  type: number;
  maxPriorityFeePerGas?: BigNumber;
  maxFeePerGas?: BigNumber;
  gasPrice?: BigNumber;
  gasLimit?: BigNumber;
}

export interface PriorityFee {
  value: number;
  unit: 'wei' | 'kwei' | 'mwei' | 'gwei' | 'szabo' | 'finney' | 'ether';
}

export type Eip1559ChainOptions = {
  txType: 'eip1559';
  // If not provided, default values will be used instead
  baseFeeMultiplier?: number;
  priorityFee?: PriorityFee;
  fulfillmentGasLimit?: number;
} & GoAsyncOptions;

export type LegacyChainOptions = {
  txType: 'legacy';
  // If not provided, default values will be used instead
  gasPriceMultiplier?: number;
  fulfillmentGasLimit?: number;
} & GoAsyncOptions;

export type ChainOptions = LegacyChainOptions | Eip1559ChainOptions;

export interface FetchOptions {
  provider: ethers.providers.Provider;
  chainOptions: ChainOptions;
}

export interface LatestBlockPercentileGasPriceStrategy {
  gasPriceStrategy: 'latestBlockPercentileGasPrice';
  percentile: number;
  minTransactionCount: number;
  pastToCompareInBlocks: number;
  maxDeviationMultiplier: number;
}
export interface ProviderRecommendedGasPriceStrategy {
  gasPriceStrategy: 'providerRecommendedGasPrice';
  recommendedGasPriceMultiplier: number;
}

export interface ConstantGasPriceStrategy {
  gasPriceStrategy: 'constantGasPrice';
  gasPrice: PriorityFee;
}

export type GasPriceOracleStrategy =
  | LatestBlockPercentileGasPriceStrategy
  | ProviderRecommendedGasPriceStrategy
  | ConstantGasPriceStrategy;

export type GasPriceOracleConfig = GasPriceOracleStrategy[];
