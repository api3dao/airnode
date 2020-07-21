import { ethers } from 'ethers';
import { RetryProvider } from './retry-provider';
import * as contracts from './contracts';

export { contracts };
export * from './gas-prices';
export * from './utils';

export function newProvider(url: string) {
  const jsonProvider = new ethers.providers.JsonRpcProvider(url);
  return new RetryProvider(jsonProvider);
}
