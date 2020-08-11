import { config } from '../config';
import * as state from './state';
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
  // STEP 2: Aggregate requests
  // =================================================================
  const requests: AggregatedRequests = {
    apiCalls: apiCallAggregator.aggregate(state1, 'apiCalls'),
    walletDesignations: apiCallAggregator.aggregate(state1, 'walletDesignations'),
    withdrawals: apiCallAggregator.aggregate(state1, 'withdrawals'),
  };
  const state3 = state.update(state2, { requests });

  return state3;
}
