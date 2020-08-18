import { config } from '../config';
import * as state from './state';
import * as logger from '../utils/logger';
import * as apiCallAggregator from '../requests/api-calls/aggregator';
import * as apiCaller from './coordinated-api-caller';

export async function start() {
  const startedAt = new Date();
  logger.logJSON('INFO', `Coordinator starting at ${startedAt.toISOString()}...`);

  // =================================================================
  // STEP 1: Creat a blank coordinator state
  // =================================================================
  const state1 = state.create();

  // =================================================================
  // STEP 2: Get the initial state from each provider
  // =================================================================
  const providerStateByIndex = await state.initializeProviders(config.nodeSettings.ethereumProviders);
  const state2 = state.update(state1, { providers: providerStateByIndex });

  // =================================================================
  // STEP 3: Group unique API calls
  // =================================================================
  const aggregatedApiCalls = apiCallAggregator.aggregate(state2);
  const state3 = state.update(state2, { aggregatedApiCalls });
  logger.logJSON('INFO', `Processing ${state3.aggregatedApiCalls.length} pending API call(s)...`);

  // =================================================================
  // STEP 4: Execute API calls and save the responses
  // =================================================================
  const aggregatedCallsWithResponses = await apiCaller.callApis(state3);
  const state4 = state.update(state3, { aggregatedApiCalls: aggregatedCallsWithResponses });

  const completedAt = new Date();
  const durationMs = Math.abs(completedAt.getTime() - startedAt.getTime());
  logger.logJSON('INFO', `Coordinator completed at ${completedAt.toISOString()}. Total time: ${durationMs}ms`)
  return state4;
}
