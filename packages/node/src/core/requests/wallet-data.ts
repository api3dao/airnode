import isEmpty from 'lodash/isEmpty';
import { WalletDataByIndex } from '../../types';

export function hasNoRequests(walletDataByIndex: WalletDataByIndex): boolean {
  return Object.keys(walletDataByIndex).every((index) => {
    const { requests } = walletDataByIndex[index];
    const requestKeys = Object.keys(requests);

    return requestKeys.every((key) => isEmpty(requests[key]));
  });
}
