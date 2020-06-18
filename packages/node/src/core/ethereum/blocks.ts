import { getProvider } from './';

export function getCurrentBlockNumber() {
  return getProvider().getBlockNumber();
}
