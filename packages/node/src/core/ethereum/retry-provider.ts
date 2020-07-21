import { ethers } from 'ethers';
import { go } from '../utils/promise-utils';

export interface RetryOptions {
  // Maximum time in total to retry
  timeout?: number;

  // Minimum Duration to wait between retries
  floor?: number;

  // Maximum Duration to wait between retries
  ceiling?: number;

  // The slot interval for exponential back-off
  interval?: number;

  // Maximum number of times to rety
  retryLimit?: number;
}

// Adapted from:
// https://github.com/ethers-io/ethers.js/blob/master/packages/experimental/src.ts/retry-provider.ts
export class RetryProvider extends ethers.providers.BaseProvider {
  readonly provider: ethers.providers.BaseProvider;
  readonly options: RetryOptions;

  constructor(provider: ethers.providers.BaseProvider, options?: RetryOptions) {
    super(provider.getNetwork());
    ethers.utils.defineReadOnly(this, 'provider', provider);
    ethers.utils.defineReadOnly(this, 'options', options || {});
  }

  perform(method: string, params: any): Promise<any> {
    return ethers.utils.poll(async () => {
      const [err, result] = await go(this.provider.perform(method, params));
      console.log('===================================');
      console.log(result);
      console.log(err);
      console.log('===================================');
      // err seems to be null when the method doesn't succeed
      if (err || err === null) {
        return undefined;
      }
      return result;
    }, this.options);
  }
}
