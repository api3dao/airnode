import { ethers } from 'ethers';
import { go } from '../utils/promise-utils';
import * as logger from '../logger';
import { BASE_FEE_MULTIPLIER, DEFAULT_RETRY_TIMEOUT_MS, PRIORITY_FEE, WEI_PER_GWEI } from '../constants';
import { GasTarget, LogsData } from '../types';

interface FetchOptions {
  readonly provider: ethers.providers.JsonRpcProvider;
}

export async function getGasPrice(options: FetchOptions): Promise<LogsData<GasTarget | null>> {
  const { provider } = options;
  const logs = [];
  {
    const operation = () => provider.getBlock('latest');
    const [err, blockHeader] = await go(operation, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
    if (err || !blockHeader?.baseFeePerGas) {
      const log = logger.pend('INFO', 'Failed to get EIP-1559 gas pricing from provider - trying fallback', err);
      logs.push(log);
    } else {
      const maxPriorityFeePerGas = ethers.utils
        .parseEther(PRIORITY_FEE)
        .div(ethers.constants.WeiPerEther)
        .div(WEI_PER_GWEI);
      const maxFeePerGas = blockHeader.baseFeePerGas.mul(BASE_FEE_MULTIPLIER).div(100).add(maxPriorityFeePerGas);
      return [
        [],
        {
          maxPriorityFeePerGas,
          maxFeePerGas,
        } as GasTarget,
      ];
    }
  }

  // Fallback to pre-EIP-1559
  const operation = () => provider.getGasPrice();
  const [err, gasPrice] = await go(operation, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
  if (err || !gasPrice) {
    const log = logger.pend('ERROR', 'Failed to get fallback gas price from provider', err);
    logs.push(log);
    return [logs, null];
  }

  return [logs, { gasPrice }];
}
