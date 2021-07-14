import flatMap from 'lodash/flatMap';
import keyBy from 'lodash/keyBy';
import * as calls from '../coordinator/calls';
import * as logger from '../logger';
import * as providers from '../providers';
import { reportHeartbeat } from '../reporting';
import { hasNoActionableRequests } from '../requests/request';
import * as state from '../coordinator/state';
import { formatDateTime, go } from '../utils';
import { Config, WorkerOptions } from '../types';

export async function startCoordinator(config: Config) {
  // =================================================================
  // STEP 1: Create a blank coordinator state
  // =================================================================
  const state1 = state.create(config);
  const { id: coordinatorId } = state1;
  const baseLogOptions = {
    format: config.nodeSettings.logFormat,
    level: config.nodeSettings.logLevel,
    meta: { coordinatorId },
  };

  const startedAt = new Date();
  logger.info(`Coordinator starting...`, baseLogOptions);

  const workerOpts: WorkerOptions = {
    cloudProvider: config.nodeSettings.cloudProvider,
    airnodeIdShort: state1.settings.airnodeIdShort,
    stage: config.nodeSettings.stage,
    region: config.nodeSettings.region,
  };

  // =================================================================
  // STEP 2: Get the initial state from each provider
  // =================================================================
  // Should not throw
  const [initializeLogs, initializedStates] = await providers.initialize(coordinatorId, config, workerOpts);
  logger.logPending(initializeLogs, baseLogOptions);

  const state2 = state.update(state1, { providerStates: { evm: initializedStates.evm } });
  state2.providerStates.evm.forEach((evmProvider) => {
    logger.info(`Initialized EVM provider:${evmProvider.settings.name}`, baseLogOptions);
  });
  logger.info('Forking to initialize providers complete', baseLogOptions);

  const hasNoRequests = state2.providerStates.evm.every((evmProvider) =>
    hasNoActionableRequests(evmProvider!.requests)
  );
  if (hasNoRequests) {
    logger.info('No actionable requests detected. Returning...', baseLogOptions);
    return state2;
  }

  // =================================================================
  // STEP 3: Group API calls with respect to request IDs
  // =================================================================
  const flatApiCalls = flatMap(state2.providerStates.evm, (provider) => provider.requests.apiCalls);
  const aggregatedApiCallsById = calls.aggregate(state2.config, flatApiCalls);
  const state3 = state.update(state2, { aggregatedApiCallsById });

  // =================================================================
  // STEP 4: Execute API calls and save the responses
  // =================================================================
  const aggregateCallIds = Object.keys(state3.aggregatedApiCallsById);
  const flatAggregatedCalls = flatMap(aggregateCallIds, (id) => state3.aggregatedApiCallsById[id]);
  const [callLogs, processedAggregatedApiCalls] = await calls.callApis(flatAggregatedCalls, baseLogOptions, workerOpts);
  logger.logPending(callLogs, baseLogOptions);

  const processedAggregatedApiCallsById = keyBy(processedAggregatedApiCalls, 'id');
  const state4 = state.update(state3, { aggregatedApiCallsById: processedAggregatedApiCallsById });

  // =================================================================
  // STEP 5: Map API responses back to each provider's API requests
  // =================================================================
  const [disaggregationLogs, providersWithAPIResponses] = calls.disaggregate(state4);
  logger.logPending(disaggregationLogs, baseLogOptions);
  const state5 = state.update(state4, { providerStates: { evm: providersWithAPIResponses } });

  // =================================================================
  // STEP 6: Initiate transactions for each provider
  // =================================================================
  state5.providerStates.evm.map(async (evmProviderState) => {
    logger.info(`Forking to submit transactions for EVM provider:${evmProviderState.settings.name}...`, baseLogOptions);
  });
  // Should not throw
  const [processedLogs, processedProviders] = await providers.processRequests(state5.providerStates, workerOpts);
  logger.logPending(processedLogs, baseLogOptions);

  const state6 = state.update(state5, { providerStates: processedProviders });
  logger.info('Forking to submit transactions complete', baseLogOptions);

  // =================================================================
  // STEP 7: Log coordinator stats
  // =================================================================
  const completedAt = new Date();
  const durationMs = Math.abs(completedAt.getTime() - startedAt.getTime());
  logger.info(`Coordinator completed at ${formatDateTime(completedAt)}. Total time: ${durationMs}ms`, baseLogOptions);

  // =================================================================
  // STEP 8: Report heartbeat and metrics
  // =================================================================
  const [heartbeatError, _heartbeatRes] = await go(() => reportHeartbeat(state6));
  if (heartbeatError) {
    logger.error('Failed to send Airnode heartbeat', { ...baseLogOptions, error: heartbeatError });
  }

  return state5;
}
