import { ethers } from 'ethers';
import { go } from '../utils/promise-utils';
import * as logger from '../logger';
import { BASE_FEE_MULTIPLIER, DEFAULT_RETRY_TIMEOUT_MS, PRIORITY_FEE, WEI_PER_GWEI } from '../constants';
import { GasTarget, LogsData, PendingLog } from '../types';

interface FetchOptions {
  readonly provider: ethers.providers.JsonRpcProvider;
}

export const getGasPrice = async (options: FetchOptions): Promise<LogsData<GasTarget | null>> => {
  const { provider } = options;
  const [logs, getBlockGas] = await (async (): Promise<[PendingLog[], GasTarget | undefined]> => {
    const operation = () => provider.getBlock('latest');
    const [err, blockHeader] = await go(operation, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
    if (err || !blockHeader?.baseFeePerGas) {
      const log = logger.pend('INFO', 'Failed to get EIP-1559 gas pricing from provider - trying fallback', err);

      return [[log], undefined];
    } else {
      const maxPriorityFeePerGas = ethers.utils
        .parseEther(PRIORITY_FEE)
        .div(ethers.constants.WeiPerEther.div(WEI_PER_GWEI));
      const maxFeePerGas = blockHeader.baseFeePerGas.mul(BASE_FEE_MULTIPLIER).div(100).add(maxPriorityFeePerGas);

      return [
        [],
        {
          maxPriorityFeePerGas,
          maxFeePerGas,
        } as GasTarget,
      ];
    }
  })();

  if (getBlockGas) {
    return [logs, getBlockGas];
  }

  // Fallback to pre-EIP-1559
  const operation = () => provider.getGasPrice();
  const [err, gasPrice] = await go(operation, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
  if (err || !gasPrice) {
    const log = logger.pend('ERROR', 'Failed to get fallback gas price from provider', err);
    return [[...logs, log], null];
  }

  return [[...logs], { gasPrice }];
};
