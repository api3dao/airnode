import groupBy from 'lodash/groupBy';
import isEmpty from 'lodash/isEmpty';
import uniq from 'lodash/uniq';
import * as wallet from '../../ethereum/wallet';
import { GroupedRequests, WalletDataByIndex } from '../../../types';

export function groupRequestsByWalletIndex(requests: GroupedRequests): WalletDataByIndex {
  const xpub = wallet.getExtendedPublicKey();

  const { apiCalls, walletDesignations, withdrawals } = requests;

  // Wallet designations are special in that they are only processed by the "admin" wallet at index 0
  const adminWalletIndex = isEmpty(walletDesignations) ? [] : ['0'];

  // Filter out duplicates to reduce Ethereum node calls
  const uniqueWalletIndices = uniq([
    ...apiCalls.map((a) => a.walletIndex),
    ...withdrawals.map((a) => a.walletIndex),
    ...adminWalletIndex,
  ]);

  const apiCallsByWalletIndex = groupBy(apiCalls, 'walletIndex');
  const withdrawalsByWalletIndex = groupBy(withdrawals, 'walletIndex');

  const walletDataByIndex = uniqueWalletIndices.reduce((acc, index) => {
    const walletData = {
      address: wallet.deriveWalletFromIndex(xpub, index),
      requests: {
        apiCalls: apiCallsByWalletIndex[index] || [],
        withdrawals: withdrawalsByWalletIndex[index] || [],
        // Only the admin wallet can process wallet designations
        walletDesignations: wallet.isAdminWalletIndex(index) ? walletDesignations : [],
      },
      // Transcation count gets fetched and set for each wallet at a later point
      transactionCount: 0,
    };

    return { ...acc, [index]: walletData };
  }, {});

  return walletDataByIndex;
}
