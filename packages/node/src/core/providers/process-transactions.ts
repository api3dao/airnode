import { ProviderState } from '../../types';
// import * as ethereum from '../ethereum';
// import * as logger from '../utils/logger';
// import * as state from './state';

export async function processTransactions(initialState: ProviderState) {
  // =================================================================
  // STEP 1: Assign nonces to processable requests
  // =================================================================

  // =================================================================
  // STEP 3: Get the latest gas price
  // =================================================================
  // const gasPrice = await ethereum.getGasPrice(state1);
  // const gweiPrice = ethereum.weiToGwei(gasPrice);
  // logger.logProviderJSON(config.name, 'INFO', `Gas price set to ${gweiPrice} Gwei`);

  // =================================================================
  // STEP 4: Submit transactions for each wallet
  // =================================================================
  return initialState;
}
