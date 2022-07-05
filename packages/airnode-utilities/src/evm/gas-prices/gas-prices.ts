import { BigNumber, ethers } from 'ethers';
import { go } from '@api3/promise-utils';
import { PriorityFee, GasTarget, FetchOptions, LegacyChainOptions, Eip1559ChainOptions } from './types';
import { LogsData, logger, PendingLog } from '../../logging';
import {
  DEFAULT_RETRY_TIMEOUT_MS,
  DEFAULT_RETRY_DELAY_MS,
  PRIORITY_FEE_IN_WEI,
  BASE_FEE_MULTIPLIER,
  GAS_PRICE_MULTIPLIER,
} from '../../constants';

// This will return the gasLimit with the gasTarget if getGasPrice is called from a place where the fulfillmentGasLimit
// is available in the config.json and otherwise no gasLimit will be returned for use with other transactions
// (e.g. withdrawal transactions and airnode-admin CLI/SDK)
export const getGasLimit = (fulfillmentGasLimit?: number) => {
  return fulfillmentGasLimit ? { gasLimit: BigNumber.from(fulfillmentGasLimit) } : {};
};

export const parsePriorityFee = ({ value, unit }: PriorityFee) => ethers.utils.parseUnits(value.toString(), unit);

export const multiplyGasPrice = (gasPrice: BigNumber, gasPriceMultiplier: number) =>
  gasPrice.mul(BigNumber.from(Math.round(gasPriceMultiplier * 100))).div(BigNumber.from(100));

export const getLegacyGasPrice = async (
  provider: ethers.providers.Provider,
  chainOptions: LegacyChainOptions
): Promise<LogsData<GasTarget | null>> => {
  const goGasPrice = await go(() => provider.getGasPrice(), {
    retries: chainOptions.retries || 1,
    attemptTimeoutMs: chainOptions.attemptTimeoutMs || DEFAULT_RETRY_TIMEOUT_MS,
    delay: { type: 'static', delayMs: DEFAULT_RETRY_DELAY_MS },
  });
  if (!goGasPrice.success) {
    const log = logger.pend('ERROR', 'All attempts to get legacy gasPrice from provider failed');
    return [[log], null];
  }

  const gasPriceMultiplier = chainOptions.gasPriceMultiplier ?? GAS_PRICE_MULTIPLIER;
  return [
    [],
    {
      type: 0,
      gasPrice: multiplyGasPrice(goGasPrice.data, gasPriceMultiplier),
      ...getGasLimit(chainOptions.fulfillmentGasLimit),
    },
  ];
};

export const getEip1559GasPricing = async (
  provider: ethers.providers.Provider,
  chainOptions: Eip1559ChainOptions
): Promise<LogsData<GasTarget | null>> => {
  const logs = Array<PendingLog>();

  const goBlockHeader = await go(() => provider.getBlock('latest'), {
    retries: chainOptions.retries || 1,
    attemptTimeoutMs: chainOptions.attemptTimeoutMs || DEFAULT_RETRY_TIMEOUT_MS,
    delay: { type: 'static', delayMs: DEFAULT_RETRY_DELAY_MS },
  });
  if (!goBlockHeader.success || !goBlockHeader.data?.baseFeePerGas) {
    logs.push(logger.pend('ERROR', 'All attempts to get EIP-1559 gas pricing from provider failed'));

    return [logs, null];
  }

  const maxPriorityFeePerGas = chainOptions.priorityFee
    ? parsePriorityFee(chainOptions.priorityFee)
    : BigNumber.from(PRIORITY_FEE_IN_WEI);
  const baseFeeMultiplier = chainOptions.baseFeeMultiplier ? chainOptions.baseFeeMultiplier : BASE_FEE_MULTIPLIER;
  const maxFeePerGas = goBlockHeader.data
    .baseFeePerGas!.mul(BigNumber.from(baseFeeMultiplier))
    .add(maxPriorityFeePerGas!);

  return [
    logs,
    {
      type: 2,
      maxPriorityFeePerGas,
      maxFeePerGas,
      ...getGasLimit(chainOptions.fulfillmentGasLimit),
    },
  ];
};

export const getProviderGasPrice = async (options: FetchOptions): Promise<LogsData<GasTarget | null>> => {
  const { chainOptions, provider } = options;

  switch (chainOptions.txType) {
    case 'legacy':
      return getLegacyGasPrice(provider, chainOptions);
    case 'eip1559':
      return getEip1559GasPricing(provider, chainOptions);
  }
};
