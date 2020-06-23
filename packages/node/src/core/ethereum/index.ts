import { ethers } from 'ethers';

export function initializeProvider() {
  return new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_URL);
}

export * from './gas-prices';
export * from './utils';
