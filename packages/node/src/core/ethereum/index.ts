import { ethers } from 'ethers';
import * as contracts from './contracts';

export { contracts };
export * from './gas-prices';
export * from './utils';

export function newProvider(url: string) {
  return new ethers.providers.JsonRpcProvider(url);
}
