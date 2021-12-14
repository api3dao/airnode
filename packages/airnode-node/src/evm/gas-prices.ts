import { BigNumber, ethers, providers } from 'ethers';
import { go } from '../utils/promise-utils';
import * as logger from '../logger';
import { BASE_FEE_MULTIPLIER, DEFAULT_RETRY_TIMEOUT_MS, PRIORITY_FEE } from '../constants';
import { ChainOptions, GasTarget, LogsData, PendingLog, PriorityFee } from '../types';

export interface FetchOptions {
  readonly provider: ethers.providers.JsonRpcProvider;
  readonly chainOptions: ChainOptions;
}

export const parsePriorityFee = ({ value, unit }: PriorityFee) => ethers.utils.parseUnits(value, unit ? unit : 'wei');

const getLegacyGasPrice = async (options: FetchOptions): Promise<LogsData<GasTarget | null>> => {
  const { provider } = options;
  const logs = Array<PendingLog>();

  const operation = (): Promise<BigNumber> =>
    new Promise((resolve, reject) => {
      provider
        .getGasPrice()
        .then((result) => {
          resolve(result);
        })
        .catch((err) => {
          logs.push(logger.pend('INFO', 'Failed attempting to get legacy gasPrice from provider', err));
          reject(err);
        });
    });

  const [err, gasPrice] = await go(operation, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
  if (err || !gasPrice) {
    logs.push(logger.pend('ERROR', 'All attempts to get legacy gasPrice from provider failed'));
    return [logs, null];
  }

  return [logs, { gasPrice }];
};

const getEip1559GasPricing = async (options: FetchOptions): Promise<LogsData<GasTarget | null>> => {
  const { provider, chainOptions } = options;
  const logs = Array<PendingLog>();

  const operation = (): Promise<providers.Block> =>
    new Promise((resolve, reject) => {
      provider
        .getBlock('latest')
        .then((result) => {
          resolve(result);
        })
        .catch((err) => {
          logs.push(logger.pend('INFO', 'Failed attempting to get block metadata from provider', err));
          reject(err);
        });
    });

  const [err, blockHeader] = await go(operation, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
  if (err || !blockHeader?.baseFeePerGas) {
    logs.push(logger.pend('ERROR', 'All attempts to get EIP-1559 gas pricing from provider failed'));

    return [logs, null];
  }

  const maxPriorityFeePerGas = chainOptions.priorityFee
    ? parsePriorityFee(chainOptions.priorityFee)
    : BigNumber.from(PRIORITY_FEE);
  const baseFeeMultiplier = chainOptions.baseFeeMultiplier ? chainOptions.baseFeeMultiplier : BASE_FEE_MULTIPLIER;
  const maxFeePerGas = blockHeader.baseFeePerGas.mul(BigNumber.from(baseFeeMultiplier)).add(maxPriorityFeePerGas!);

  return [
    logs,
    {
      maxPriorityFeePerGas,
      maxFeePerGas,
    } as GasTarget,
  ];
};

export const getGasPrice = async (options: FetchOptions): Promise<LogsData<GasTarget | null>> => {
  const { chainOptions } = options;

  switch (chainOptions.txType) {
    case '1':
      return getLegacyGasPrice(options);
    case '2':
      return getEip1559GasPricing(options);
    default:
      return [[], null];
  }
};
