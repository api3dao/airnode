import { BigNumber, ethers } from 'ethers';
import { PriorityFee, GasTarget, FetchOptions } from './types';
import { go } from '../../promises';
import { LogsData, logger, PendingLog } from '../../logging';
import { DEFAULT_RETRY_TIMEOUT_MS, PRIORITY_FEE_IN_WEI, BASE_FEE_MULTIPLIER } from '../../constants';

export const parsePriorityFee = ({ value, unit }: PriorityFee) =>
  ethers.utils.parseUnits(value.toString(), unit ?? 'wei');

export const getLegacyGasPrice = async (options: FetchOptions): Promise<LogsData<GasTarget | null>> => {
  const { provider, chainOptions } = options;

  const [err, gasPrice] = await go(() => provider.getGasPrice(), {
    retries: chainOptions.retries || 1,
    timeoutMs: chainOptions.timeoutMs || DEFAULT_RETRY_TIMEOUT_MS,
    retryDelayMs: chainOptions.retryDelayMs,
  });
  if (err || !gasPrice) {
    const log = logger.pend('ERROR', 'All attempts to get legacy gasPrice from provider failed');
    return [[log], null];
  }

  return [[], { gasPrice }];
};

export const getEip1559GasPricing = async (options: FetchOptions): Promise<LogsData<GasTarget | null>> => {
  const { provider, chainOptions } = options;
  const logs = Array<PendingLog>();

  const [err, blockHeader] = await go(() => provider.getBlock('latest'), {
    retries: chainOptions.retries || 1,
    timeoutMs: chainOptions.timeoutMs || DEFAULT_RETRY_TIMEOUT_MS,
    retryDelayMs: chainOptions.retryDelayMs,
  });
  if (err || !blockHeader?.baseFeePerGas) {
    logs.push(logger.pend('ERROR', 'All attempts to get EIP-1559 gas pricing from provider failed'));

    return [logs, null];
  }

  const maxPriorityFeePerGas = chainOptions.priorityFee
    ? parsePriorityFee(chainOptions.priorityFee)
    : BigNumber.from(PRIORITY_FEE_IN_WEI);
  const baseFeeMultiplier = chainOptions.baseFeeMultiplier ? chainOptions.baseFeeMultiplier : BASE_FEE_MULTIPLIER;
  const maxFeePerGas = blockHeader.baseFeePerGas.mul(BigNumber.from(baseFeeMultiplier)).add(maxPriorityFeePerGas!);

  return [
    logs,
    {
      maxPriorityFeePerGas,
      maxFeePerGas,
    },
  ];
};

export const getGasPrice = async (options: FetchOptions): Promise<LogsData<GasTarget | null>> => {
  const { chainOptions } = options;

  switch (chainOptions.txType) {
    case 'legacy':
      return getLegacyGasPrice(options);
    case 'eip1559':
      return getEip1559GasPricing(options);
  }
};
