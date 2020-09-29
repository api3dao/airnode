import flatMap from 'lodash/flatMap';
import isEmpty from 'lodash/isEmpty';
import { config } from '../config';
import * as apiCalls from '../requests/api-calls';
import * as calls from './calls';
import * as state from './state';
import * as logger from '../logger';
import * as settings from '../config/provider-settings';
import { formatDateTime } from '../utils/date-utils';
import { spawnProviderRequestProcessor } from '../providers/worker';
import { CoordinatorOptions } from '../../types';

export async function start(options?: CoordinatorOptions) {
  // =================================================================
  // STEP 1: Validate the provided options
  // =================================================================
  const optionsValidationMessages = settings.validate(options);
  if (!isEmpty(optionsValidationMessages)) {
    optionsValidationMessages!.forEach((msg) => logger.logJSON('ERROR', msg));
    return null;
  }

  // =================================================================
  // STEP 2: Creat a blank coordinator state
  // =================================================================
  const startedAt = new Date();
  logger.logJSON('INFO', `Coordinator starting at ${formatDateTime(startedAt)}...`);
  const state1 = state.create();

  // =================================================================
  // STEP 3: Get the initial state from each provider
  // =================================================================
  const providers = await state.initializeProviders(config.nodeSettings.chains);
  const state2 = state.update(state1, { providers });
  state2.providers.forEach((provider) => {
    logger.logJSON('INFO', `Initialized provider:${provider.config.name} (chain:${provider.config.chainId})`);
  });
  logger.logJSON('INFO', 'Forking to initialize providers complete');

  // =================================================================
  // STEP 4: Group unique API calls
  // =================================================================
  const flatApiCalls = flatMap(state2.providers, (provider) => apiCalls.flatten(provider.walletDataByIndex));
  const aggregatedApiCalls = calls.aggregate(flatApiCalls);
  const state3 = state.update(state2, { aggregatedApiCalls });
  logger.logJSON('INFO', `Processing ${state3.aggregatedApiCalls.length} pending API call(s)...`);

  // =================================================================
  // STEP 5: Execute API calls and save the responses
  // =================================================================
  const aggregatedCallsWithResponses = await calls.callApis(state3.aggregatedApiCalls);
  const state4 = state.update(state3, { aggregatedApiCalls: aggregatedCallsWithResponses });

  // =================================================================
  // STEP 6: Map API responses back to each provider's API requests
  // =================================================================
  const providersWithAPIResponses = calls.disaggregate(state4);
  const state5 = state.update(state4, { providers: providersWithAPIResponses });

  // =================================================================
  // STEP 7: Initiate transactions for each provider
  // =================================================================
  const providerTransactions = state5.providers.map(async (provider) => {
    logger.logJSON('INFO', `Forking to submit transactions for provider:${provider.config.name}...`);
    return await spawnProviderRequestProcessor(provider);
  });
  await Promise.all(providerTransactions);
  logger.logJSON('INFO', 'Forking to submit transactions complete');

  // =================================================================
  // STEP 8: Log coordinator stats
  // =================================================================
  const completedAt = new Date();
  const durationMs = Math.abs(completedAt.getTime() - startedAt.getTime());
  logger.logJSON('INFO', `Coordinator completed at ${formatDateTime(completedAt)}. Total time: ${durationMs}ms`);

  return state5;
}
