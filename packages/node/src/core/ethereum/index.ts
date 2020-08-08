import { RetryProvider } from './retry-provider';
import * as cbor from './cbor';
import * as contracts from './contracts';
import * as networks from './networks';

export { cbor, contracts };
export * from './utils';
export * from './gas-prices';
export * from './utils';

export function newProvider(url: string, chainId: number) {
  // Ethers makes a call to get the network in the background if it is
  // not provided/undefined when initializing the provider. We keep
  // a list of "known" networks to stop these extra calls if possible.
  const network = networks.NETWORKS[chainId] || null;

  // Ethers only let's us configure the timeout when creating a provider, so
  // set a high value here and we'll control it ourselves by overriding
  // the 'perform' method.
  return new RetryProvider({ url, timeout: 30_000 }, network);
}
