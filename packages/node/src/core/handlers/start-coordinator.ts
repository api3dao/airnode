import flatMap from 'lodash/flatMap';
import * as calls from '../coordinator/calls';
import * as logger from '../logger';
import * as providers from '../providers';
import * as request from '../requests/request';
import * as state from '../coordinator/state';
import { formatDateTime } from '../utils/date-utils';
import { spawnProviderRequestProcessor } from '../providers/worker';
import { Config, WorkerOptions } from '../../types';

export async function startCoordinator(config: Config) {
  // =================================================================
  // STEP 1: Create a blank coordinator state
  // =================================================================
  const state1 = state.create(config);
  const { id: coordinatorId } = state1;
  const baseLogOptions = { format: config.nodeSettings.logFormat, meta: { coordinatorId } };

  const startedAt = new Date();
  logger.info(`Coordinator starting...`, baseLogOptions);

  const workerOpts: WorkerOptions = {
    coordinatorId,
    coordinatorSettings: state1.settings,
    config: state1.config,
    providerIdShort: state1.settings.providerIdShort,
    stage: state1.settings.stage,
    region: state1.settings.region,
  };

  // =================================================================
  // STEP 2: Get the initial state from each provider
  // =================================================================
  const EVMProviders = await providers.initialize(workerOpts);
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
  // STEP 3: Group unique API calls
  // =================================================================
  const flatApiCalls = flatMap(state2.EVMProviders, (provider) => provider.requests.apiCalls);
  const aggregatedApiCallsById = calls.aggregate(state2.config, flatApiCalls);
  const flatAggregatedCalls = flatMap(Object.keys(aggregatedApiCallsById), (id) => aggregatedApiCallsById[id]);
  logger.info(`Processing ${flatAggregatedCalls.length} pending API call(s)...`, baseLogOptions);
  const state3 = state.update(state2, { aggregatedApiCallsById });

  // =================================================================
  // STEP 4: Execute API calls and save the responses
  // =================================================================
  const [callLogs, aggregatedCallsWithResponses] = await calls.callApis(
    state3.aggregatedApiCallsById,
    baseLogOptions,
    workerOpts
  );
  const state4 = state.update(state3, { aggregatedApiCallsById: aggregatedCallsWithResponses });
  logger.logPending(callLogs, baseLogOptions);

  // =================================================================
  // STEP 5: Map API responses back to each provider's API requests
  // =================================================================
  const [disaggregationLogs, providersWithAPIResponses] = calls.disaggregate(state4);
  logger.logPending(disaggregationLogs, baseLogOptions);
  const state5 = state.update(state4, { EVMProviders: providersWithAPIResponses });

  // =================================================================
  // STEP 6: Initiate transactions for each provider
  // =================================================================
  const providerTransactions = state5.EVMProviders.map(async (providerState) => {
    logger.info(`Forking to submit transactions for provider:${providerState.settings.name}...`, baseLogOptions);
    return await spawnProviderRequestProcessor(providerState, workerOpts);
  });
  await Promise.all(providerTransactions);
  logger.info('Forking to submit transactions complete', baseLogOptions);

  // =================================================================
  // STEP 7: Log coordinator stats
  // =================================================================
  const completedAt = new Date();
  const durationMs = Math.abs(completedAt.getTime() - startedAt.getTime());
  logger.info(`Coordinator completed at ${formatDateTime(completedAt)}. Total time: ${durationMs}ms`, baseLogOptions);

  return state5;
}
