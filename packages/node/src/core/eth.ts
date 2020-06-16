import { ethers } from 'ethers';

export function getProvider() {
  return new ethers.providers.JsonRpcProvider('');
}

export function getCurrentBlockNumber() {
  return getProvider().getBlockNumber();
}
