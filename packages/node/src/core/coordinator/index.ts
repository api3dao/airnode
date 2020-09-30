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
    optionsValidationMessages!.forEach((msg) => logger.error(msg));
    return null;
  }

  // =================================================================
  // STEP 2: Creat a blank coordinator state
  // =================================================================
  const state1 = state.create();
  const { id: coordinatorId } = state1;

  const startedAt = new Date();
  logger.info(`Coordinator starting at ${formatDateTime(startedAt)}...`, { coordinatorId });

  // =================================================================
  // STEP 3: Get the initial state from each provider
  // =================================================================
  const providers = await state.initializeProviders(state1.id, config.nodeSettings.chains);
  const state2 = state.update(state1, { providers });
  state2.providers.forEach((provider) => {
    logger.info(`Initialized provider:${provider.config.name} (chain:${provider.config.chainId})`, { coordinatorId });
  });
  logger.info('Forking to initialize providers complete', { coordinatorId });

  // =================================================================
  // STEP 4: Group unique API calls
  // =================================================================
  const flatApiCalls = flatMap(state2.providers, (provider) => apiCalls.flatten(provider.walletDataByIndex));
  const aggregatedApiCalls = calls.aggregate(flatApiCalls);
  const state3 = state.update(state2, { aggregatedApiCalls });
  logger.info(`Processing ${state3.aggregatedApiCalls.length} pending API call(s)...`, { coordinatorId });

  // =================================================================
  // STEP 5: Execute API calls and save the responses
  // =================================================================
  const [callLogs, aggregatedCallsWithResponses] = await calls.callApis(state3.aggregatedApiCalls);
  const state4 = state.update(state3, { aggregatedApiCalls: aggregatedCallsWithResponses });
  logger.logPending(callLogs, { coordinatorId });

  // =================================================================
  // STEP 6: Map API responses back to each provider's API requests
  // =================================================================
  const providersWithAPIResponses = calls.disaggregate(state4);
  const state5 = state.update(state4, { providers: providersWithAPIResponses });

  // =================================================================
  // STEP 7: Initiate transactions for each provider
  // =================================================================
  const providerTransactions = state5.providers.map(async (provider) => {
    logger.info(`Forking to submit transactions for provider:${provider.config.name}...`, { coordinatorId });
    return await spawnProviderRequestProcessor(provider);
  });
  await Promise.all(providerTransactions);
  logger.info('Forking to submit transactions complete', { coordinatorId });

  // =================================================================
  // STEP 8: Log coordinator stats
  // =================================================================
  const completedAt = new Date();
  const durationMs = Math.abs(completedAt.getTime() - startedAt.getTime());
  logger.info(`Coordinator completed at ${formatDateTime(completedAt)}. Total time: ${durationMs}ms`, { coordinatorId });

  return state5;
}
