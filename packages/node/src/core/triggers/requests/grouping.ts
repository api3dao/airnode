import groupBy from 'lodash/groupBy';
import isEmpty from 'lodash/isEmpty';
import uniq from 'lodash/uniq';
import * as ethereum from '../../ethereum';
import { GroupedRequests, ProviderState, WalletDataByIndex } from '../../../types';

export function groupRequestsByWalletIndex(state: ProviderState, requests: GroupedRequests): WalletDataByIndex {
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
      address: ethereum.deriveWalletFromIndex(state.xpub, index),
      requests: {
        apiCalls: apiCallsByWalletIndex[index],
        withdrawals: withdrawalsByWalletIndex[index],
        walletDesignations: ethereum.isAdminWalletIndex(index) ? walletDataByIndex : [],
      },
      // Transcation count 
      transactionCount: -1,
    };

    return { ...acc, [index]: walletData };
  }, {});


  return walletDataByIndex;
}

