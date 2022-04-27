import { BigNumber, ethers } from 'ethers';
import { PromiseOptions } from '../../promises';

export interface GasTarget {
  maxPriorityFeePerGas?: BigNumber;
  maxFeePerGas?: BigNumber;
  gasPrice?: BigNumber;
  gasLimit?: BigNumber;
}

export interface PriorityFee {
  value: number;
  unit?: 'wei' | 'kwei' | 'mwei' | 'gwei' | 'szabo' | 'finney' | 'ether';
}

export interface ChainOptions extends PromiseOptions {
  txType: 'legacy' | 'eip1559';
  gasPriceMultiplier?: number;
  baseFeeMultiplier?: number;
  priorityFee?: PriorityFee;
  fulfillmentGasLimit?: number;
}

export interface FetchOptions {
  provider: ethers.providers.JsonRpcProvider | ethers.providers.Provider;
  chainOptions: ChainOptions;
}
