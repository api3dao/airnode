import flatMap from 'lodash/flatMap';
import { config } from '../config';
import * as apiCalls from '../requests/api-calls';
import * as state from './state';
import * as logger from '../logger';
import { formatDateTime } from '../utils/date-utils';
import * as calls from './calls';
import { spawnProviderRequestProcessor } from '../providers/worker';

export async function start() {
  const startedAt = new Date();
  logger.logJSON('INFO', `Coordinator starting at ${formatDateTime(startedAt)}...`);

  // =================================================================
  // STEP 1: Creat a blank coordinator state
  // =================================================================
  const state1 = state.create();

  // =================================================================
  // STEP 2: Get the initial state from each provider
  // =================================================================
  const providers = await state.initializeProviders(config.nodeSettings.ethereumProviders);
  const state2 = state.update(state1, { providers });
  state2.providers.forEach((provider) => {
    logger.logJSON('INFO', `Initialized provider:${provider.config.name} (chain:${provider.config.chainId})`);
  });
  logger.logJSON('INFO', 'Forking to initialize providers complete');

  // =================================================================
  // STEP 3: Group unique API calls
  // =================================================================
  const flatApiCalls = flatMap(state2.providers, (provider) => apiCalls.flatten(provider.walletDataByIndex));
  const aggregatedApiCalls = calls.aggregate(flatApiCalls);
  const state3 = state.update(state2, { aggregatedApiCalls });
  logger.logJSON('INFO', `Processing ${state3.aggregatedApiCalls.length} pending API call(s)...`);

  // =================================================================
  // STEP 4: Execute API calls and save the responses
  // =================================================================
  const aggregatedCallsWithResponses = await calls.callApis(state3.aggregatedApiCalls);
  const state4 = state.update(state3, { aggregatedApiCalls: aggregatedCallsWithResponses });

  // =================================================================
  // STEP 5: Map API responses back to each provider's API requests
  // =================================================================
  const providersWithAPIResponses = calls.disaggregate(state4);
  const state5 = state.update(state4, { providers: providersWithAPIResponses });

  // =================================================================
  // STEP 6: Initiate transactions for each provider
  // =================================================================
  const providerTransactions = state5.providers.map(async (provider) => {
    logger.logJSON('INFO', `Forking to submit transactions for provider:${provider.config.name}...`);
    return await spawnProviderRequestProcessor(provider);
  });
  await Promise.all(providerTransactions);
  logger.logJSON('INFO', 'Forking to submit transactions complete');

  // =================================================================
  // STEP 7: Log run stats
  // =================================================================
  const completedAt = new Date();
  const durationMs = Math.abs(completedAt.getTime() - startedAt.getTime());
  logger.logJSON('INFO', `Coordinator completed at ${formatDateTime(completedAt)}. Total time: ${durationMs}ms`);

  return state5;
}
