import { ethers } from 'ethers';

export function getProvider() {
  return new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_URL);
}

export function getCurrentBlockNumber() {
  return getProvider().getBlockNumber();
}
