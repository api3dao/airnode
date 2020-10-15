import orderBy from 'lodash/orderBy';
import { ClientRequest, GroupedRequests, WalletDataByIndex } from '../../types';

function sortRequests<T>(requests: ClientRequest<T>[]): ClientRequest<T>[] {
  // In order to keep consistency between runs, requests are sorted by the following criteria:
  //
  //   1. Block number (ascending)
  //   2. Transaction hash (ascending)
  return orderBy(requests, ['metadata.blockNumber', 'metadata.transactionHash']);
}

export function sortRequestsByWalletIndex(walletDataByIndex: WalletDataByIndex) {
  const walletIndices = Object.keys(walletDataByIndex);

  const sortedRequests = walletIndices.reduce((acc, index) => {
    const walletData = walletDataByIndex[index];

    const sortedRequests: GroupedRequests = {
      apiCalls: sortRequests(walletData.requests.apiCalls),
      withdrawals: sortRequests(walletData.requests.withdrawals),
    };

    const updatedWalletData = { ...walletData, requests: sortedRequests };

    return { ...acc, [index]: updatedWalletData };
  }, {});

  return sortedRequests;
}
