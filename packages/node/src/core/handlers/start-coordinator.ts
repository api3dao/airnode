import flatMap from 'lodash/flatMap';
import isEmpty from 'lodash/isEmpty';
import * as calls from '../coordinator/calls';
import * as logger from '../logger';
import * as providers from '../providers';
import * as request from '../requests/request';
import * as state from '../coordinator/state';
import * as validation from '../config/validation';
import { formatDateTime } from '../utils/date-utils';
import { spawnProviderRequestProcessor } from '../providers/worker';
import { Config } from '../../types';

export async function startCoordinator(config: Config) {
  // =================================================================
  // STEP 1: Validate the provided options
  // =================================================================
  const settingsMessages = validation.validate(config.nodeSettings);
  if (!isEmpty(settingsMessages)) {
    const logOptions = { format: config.nodeSettings.logFormat, meta: {} };
    settingsMessages!.forEach((msg) => logger.error(msg, logOptions));
    return null;
  }

  // =================================================================
  // STEP 2: Creat a blank coordinator state
  // =================================================================
  const state1 = state.create(config);
  const { id: coordinatorId } = state1;
  const baseLogOptions = { format: config.nodeSettings.logFormat, meta: { coordinatorId } };

  const startedAt = new Date();
  logger.info(`Coordinator starting...`, baseLogOptions);

  // =================================================================
  // STEP 3: Get the initial state from each provider
  // =================================================================
  const EVMProviders = await providers.initialize(state1.id, config.nodeSettings.chains, state1.config);
  const state2 = state.update(state1, { EVMProviders });
  state2.EVMProviders.forEach((provider) => {
    logger.info(`Initialized EVM provider:${provider.settings.name}`, baseLogOptions);
  });
  logger.info('Forking to initialize providers complete', baseLogOptions);

  const hasNoRequests = state2.EVMProviders.every((provider) => request.hasNoRequests(provider!.requests));
  if (hasNoRequests) {
    logger.info('No actionable requests detected. Exiting...', baseLogOptions);
    return state2;
  }

  // =================================================================
  // STEP 4: Group unique API calls
  // =================================================================
  const flatApiCalls = flatMap(state2.EVMProviders, (provider) => provider.requests.apiCalls);
  const aggregatedApiCallsById = calls.aggregate(state2.config, flatApiCalls);
  const flatAggregatedCalls = flatMap(Object.keys(aggregatedApiCallsById), (id) => aggregatedApiCallsById[id]);
  logger.info(`Processing ${flatAggregatedCalls.length} pending API call(s)...`, baseLogOptions);
  const state3 = state.update(state2, { aggregatedApiCallsById });

  // =================================================================
  // STEP 5: Execute API calls and save the responses
  // =================================================================
  const [callLogs, aggregatedCallsWithResponses] = await calls.callApis(
    state3.config,
    state3.aggregatedApiCallsById,
    baseLogOptions
  );
  const state4 = state.update(state3, { aggregatedApiCallsById: aggregatedCallsWithResponses });
  logger.logPending(callLogs, baseLogOptions);

  // =================================================================
  // STEP 6: Map API responses back to each provider's API requests
  // =================================================================
  const [disaggregationLogs, providersWithAPIResponses] = calls.disaggregate(state4);
  logger.logPending(disaggregationLogs, baseLogOptions);
  const state5 = state.update(state4, { EVMProviders: providersWithAPIResponses });

  // =================================================================
  // STEP 7: Initiate transactions for each provider
  // =================================================================
  const providerTransactions = state5.EVMProviders.map(async (provider) => {
    logger.info(`Forking to submit transactions for provider:${provider.settings.name}...`, baseLogOptions);
    return await spawnProviderRequestProcessor(state5.config, provider);
  });
  await Promise.all(providerTransactions);
  logger.info('Forking to submit transactions complete', baseLogOptions);

  // =================================================================
  // STEP 8: Log coordinator stats
  // =================================================================
  const completedAt = new Date();
  const durationMs = Math.abs(completedAt.getTime() - startedAt.getTime());
  logger.info(`Coordinator completed at ${formatDateTime(completedAt)}. Total time: ${durationMs}ms`, baseLogOptions);

  return state5;
}
