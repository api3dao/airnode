import { ethers } from 'ethers';

export function getNetwork() {
  return process.env.ETHEREUM_NETWORK || 'ropsten';
}

export function getProvider() {
  return new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_URL);
}

export * from './blocks';
export * from './gas-prices';
