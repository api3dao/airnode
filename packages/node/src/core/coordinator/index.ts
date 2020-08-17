import { config } from '../config';
import * as state from './state';
import * as logger from '../utils/logger';
import * as apiCallAggregator from '../requests/api-calls/aggregator';
import * as apiCaller from './coordinated-api-caller';

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
  const aggregatedApiCalls = apiCallAggregator.aggregate(state2);
  const state3 = state.update(state2, { aggregatedApiCalls });
  logger.logJSON('INFO', `Processing ${state3.aggregatedApiCalls.length} pending API call(s)...`);

  // =================================================================
  // STEP 3: Make API calls and save the responses
  // =================================================================
  const aggregatedCallsWithResponses = await apiCaller.callApis(state3);
  const state4 = state.update(state3, { aggregatedApiCalls: aggregatedCallsWithResponses });

  return state4;
}
