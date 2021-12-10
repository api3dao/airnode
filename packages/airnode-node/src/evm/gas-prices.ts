import { BigNumber, ethers } from 'ethers';
import { parseEther } from 'ethers/lib/utils';
import { go } from '../utils/promise-utils';
import * as logger from '../logger';
import { BASE_FEE_MULTIPLIER, DEFAULT_RETRY_TIMEOUT_MS, PRIORITY_FEE, WEI_PER_GWEI } from '../constants';
import { ChainOptions, GasTarget, LogsData } from '../types';

interface FetchOptions {
  readonly provider: ethers.providers.JsonRpcProvider;
  readonly chainOptions: ChainOptions;
}

export const getGasPrice = async (options: FetchOptions): Promise<LogsData<GasTarget | null>> => {
  const { provider, chainOptions } = options;

  switch (chainOptions.txType) {
    case '1': {
      const operation = () => provider.getGasPrice();
      const [err, gasPrice] = await go(operation, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
      if (err || !gasPrice) {
        const log = logger.pend('ERROR', 'Failed to get legacy gas price from provider', err);
        return [[log], null];
      }

      return [[], { gasPrice }];
    }
    case '2': {
      const operation = () => provider.getBlock('latest');
      const [err, blockHeader] = await go(operation, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
      if (err || !blockHeader?.baseFeePerGas) {
        const log = logger.pend('INFO', 'Failed to get EIP-1559 gas pricing from provider', err);

        return [[log], null];
      }

      const maxPriorityFeePerGas = chainOptions.priorityFeeGWei
        ? parseEther(chainOptions.priorityFeeGWei).mul(WEI_PER_GWEI).div(ethers.constants.WeiPerEther)
        : BigNumber.from(PRIORITY_FEE);
      const baseFeeMultiplier = chainOptions.baseFeeMultiplier ? chainOptions.baseFeeMultiplier : BASE_FEE_MULTIPLIER;
      const maxFeePerGas = blockHeader.baseFeePerGas.mul(BigNumber.from(baseFeeMultiplier)).add(maxPriorityFeePerGas!);

      return [
        [],
        {
          maxPriorityFeePerGas,
          maxFeePerGas,
        } as GasTarget,
      ];
    }
    default:
      return [[], null];
  }
};
