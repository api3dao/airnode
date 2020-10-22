import flatMap from 'lodash/flatMap';
import groupBy from 'lodash/groupBy';
import uniq from 'lodash/uniq';
import * as wallet from '../wallet';
import { ClientRequest, GroupedRequests, WalletDataByIndex, Withdrawal } from '../../../types';

export function groupRequestsByWalletIndex(requests: GroupedRequests): WalletDataByIndex {
  const xpub = wallet.getExtendedPublicKey();

  const { apiCalls, withdrawals } = requests;

  // Filter out duplicates to reduce Ethereum node calls
  const uniqueWalletIndices = uniq([...apiCalls.map((a) => a.walletIndex), ...withdrawals.map((a) => a.walletIndex)]);

  const apiCallsByWalletIndex = groupBy(apiCalls, 'walletIndex');
  const withdrawalsByWalletIndex = groupBy(withdrawals, 'walletIndex');

  const walletDataByIndex = uniqueWalletIndices.reduce((acc, index) => {
    const walletData = {
      address: wallet.deriveWalletAddressFromIndex(xpub, index),
      requests: {
        apiCalls: apiCallsByWalletIndex[index] || [],
        withdrawals: withdrawalsByWalletIndex[index] || [],
      },
      // Transcation count gets fetched and set for each wallet at a later point
      transactionCount: 0,
    };

    return { ...acc, [index]: walletData };
  }, {});

  return walletDataByIndex;
}

// TODO: temporary workaround until wallet data by index is dropped
export function flattenWithdrawals(walletDataByIndex: WalletDataByIndex): ClientRequest<Withdrawal>[] {
  const walletIndices = Object.keys(walletDataByIndex);

  return flatMap(walletIndices, (index) => {
    return walletDataByIndex[index].requests.withdrawals;
  });
}
