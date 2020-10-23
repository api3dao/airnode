import flatMap from 'lodash/flatMap';
import { ApiCall, ClientRequest, WalletDataByIndex } from '../../types';

export function flatten(walletDataByIndex: WalletDataByIndex): ClientRequest<ApiCall>[] {
  const walletIndices = Object.keys(walletDataByIndex);

  return flatMap(walletIndices, (index) => {
    return walletDataByIndex[index].requests.apiCalls;
  });
}
