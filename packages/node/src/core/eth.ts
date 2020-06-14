import { JsonRpcProvider } from '@ethersproject/providers';

export function getProvider() {
  return new JsonRpcProvider(process.env.ETHEREUM_URL);
}

export function getCurrentBlockNumber() {
  return getProvider().getBlockNumber();
}
