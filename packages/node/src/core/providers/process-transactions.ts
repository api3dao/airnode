import { ProviderState } from '../../types';
import * as ethereum from '../ethereum';
import * as logger from '../utils/logger';
import * as nonces from '../transactions/nonces';
import * as state from './state';

export async function processTransactions(initialState: ProviderState) {
  // =================================================================
  // STEP 1: Assign nonces to processable requests
  // =================================================================
  const walletDataByIndexWithNonces = nonces.assign(initialState);
  const state1 = state.update(initialState, { walletDataByIndex: walletDataByIndexWithNonces });

  // =================================================================
  // STEP 2: Get the latest gas price
  // =================================================================
  const gasPrice = await ethereum.getGasPrice(state1);
  const gweiPrice = ethereum.weiToGwei(gasPrice);
  logger.logProviderJSON(state1.config.name, 'INFO', `Gas price set to ${gweiPrice} Gwei`);
  const state2 = state.update(state1, { gasPrice });

  // =================================================================
  // STEP 3: Submit transactions for each wallet
  // =================================================================
  console.log(state2);

  return state2;
}
