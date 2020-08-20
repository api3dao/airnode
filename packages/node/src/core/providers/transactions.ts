import groupBy from 'lodash/groupBy';
import { ProviderState } from '../../types';
import * as ethereum from '../ethereum';
import * as logger from '../utils/logger';
import * as state from './state';

export async function processTransactions(initialState: ProviderState) {
  // =================================================================
  // STEP 1: Get the wallet addresses for unique requests
  // =================================================================
  const { config, requests, xpub } = initialState;

  const walletIndices = Object.keys(initialState.transactionCountsByWalletIndex);
  const walletAddressesByIndex = walletIndices.reduce((acc, index) => {
    const address = ethereum.deriveWalletFromIndex(xpub, index);
    return { ...acc, [index]: address };
  }, {});
  const state1 = state.update(initialState, { walletAddressesByIndex });

  // =================================================================
  // STEP 2: Order requests and assign nonces
  // =================================================================
  const apiCallsByWalletIndex = groupBy(requests.apiCalls, 'walletIndex');
  const withdrawalsByWalletIndex = groupBy(requests.withdrawals, 'walletIndex');

  const walletDataByIndex = walletIndices.reduce((acc, index) => {
    const address = walletAddressesByIndex[index];
    const apiCalls = apiCallsByWalletIndex[index] || [];
    const withdrawals = withdrawalsByWalletIndex[index] || [];

    const walletData = { address, apiCalls, withdrawals };

    return { ...acc, [index]: walletData };
  }, {});

  // =================================================================
  // STEP 3: Get the latest gas price
  // =================================================================
  const gasPrice = await ethereum.getGasPrice(state1);
  const gweiPrice = ethereum.weiToGwei(gasPrice);
  logger.logProviderJSON(config.name, 'INFO', `Gas price set to ${gweiPrice} Gwei`);

  // =================================================================
  // STEP 4: Submit transactions for each wallet
  // =================================================================
  return walletDataByIndex;
}
