import { RetryProvider } from './retry-provider';
import * as contracts from './contracts';

export { contracts };
export * from './gas-prices';
export * from './utils';

export function newProvider(url: string) {
  // Ethers only let's us configure the timeout when creating a provider, so
  // set a high value here and we'll control it ourselves by overriding
  // the 'perform' method.
  return new RetryProvider({ url, timeout: 30_000 });
}
