import { config } from '../config';
import * as state from './state';
import * as logger from '../utils/logger';
import * as apiCallAggregator from '../requests/api-calls/aggregator';
import { AggregatedRequests } from '../../types';

export async function start() {
  const state1 = state.create();

  // =================================================================
  // STEP 1: Get the initial state from each provider
  // =================================================================
  const providerStateByIndex = await state.initializeProviders(config.nodeSettings.ethereumProviders);
  const state2 = state.update(state1, { providers: providerStateByIndex });

  // =================================================================
  // STEP 2: Group unique requests
  // =================================================================
  const requests: AggregatedRequests = {
    apiCalls: apiCallAggregator.aggregate(state1, 'apiCalls'),
    walletDesignations: apiCallAggregator.aggregate(state1, 'walletDesignations'),
    withdrawals: apiCallAggregator.aggregate(state1, 'withdrawals'),
  };
  const state3 = state.update(state2, { requests });

  logger.logJSON('INFO', `Processing ${state3.requests.apiCalls.length} pending API calls`);
  logger.logJSON('INFO', `Processing ${state3.requests.walletDesignations.length} pending wallet designations`);
  logger.logJSON('INFO', `Processing ${state3.requests.withdrawals.length} pending withdrawals`);

  // =================================================================
  // STEP 3: Group unique requests
  // =================================================================

  return state3;
}
