import { ethers } from 'ethers';
import { go } from '../utils/promise-utils';
import * as logger from '../logger';
import { LogsData } from '../../types';

interface FetchOptions {
  provider: ethers.providers.JsonRpcProvider;
}

export async function getGasPrice(options: FetchOptions): Promise<LogsData<ethers.BigNumber | null>> {
  const { provider } = options;
  const [err, weiPrice] = await go(provider.getGasPrice());
  if (err || !weiPrice) {
    const log = logger.pend('ERROR', 'Failed to get gas price from provider', err);
    return [[log], null];
  }
  return [[], weiPrice];
}
