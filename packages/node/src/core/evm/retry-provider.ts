import { ethers } from 'ethers';
import { retryOperation } from '../utils/promise-utils';
import { NETWORKS } from './networks';

export class RetryProvider extends ethers.providers.JsonRpcProvider {
  public perform(method: string, params: any): Promise<any> {
    const timeouts = [5_000, 10_000];
    const operation = () => super.perform(method, params);

    return retryOperation(2, operation, { timeouts, delay: 50 });
  }
}

export function newProvider(url: string, chainId: number) {
  // Ethers makes a call to get the network in the background if it is
  // not provided/undefined when initializing the provider. We keep
  // a list of "known" networks to stop these extra calls if possible.
  const network = NETWORKS[chainId] || null;

  // Ethers only lets us configure the timeout when creating a provider, so
  // set a high value here and we'll control it ourselves by overriding
  // the 'perform' method.
  return new RetryProvider({ url, timeout: 30_000 }, network);
}
