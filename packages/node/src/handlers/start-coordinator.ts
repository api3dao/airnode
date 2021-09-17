import flatMap from 'lodash/flatMap';
import keyBy from 'lodash/keyBy';
import * as calls from '../coordinator/calls';
import * as logger from '../logger';
import * as providers from '../providers';
import { reportHeartbeat } from '../reporting';
import { hasNoActionableRequests } from '../requests/request';
import * as state from '../coordinator/state';
import { formatDateTime, go } from '../utils';
import { Config, CoordinatorState, WorkerOptions } from '../types';

export async function startCoordinator(config: Config) {
  const startedAt = new Date();

  const endState = await coordinator(config);
  const logOptions = logger.buildBaseOptions(config, { coordinatorId: endState.id });

  const completedAt = new Date();
  const durationMs = Math.abs(completedAt.getTime() - startedAt.getTime());
  logger.info(`Coordinator completed at ${formatDateTime(completedAt)}. Total time: ${durationMs}ms`, logOptions);

  const [heartbeatError, _heartbeatRes] = await go(() => reportHeartbeat(endState));
  if (heartbeatError) {
    logger.error('Failed to send Airnode heartbeat', { ...logOptions, error: heartbeatError });
  }
}

async function coordinator(config: Config): Promise<CoordinatorState> {
  // =================================================================
  // STEP 1: Create a blank coordinator state
  // =================================================================
  const state1 = state.create(config);
  const { id: coordinatorId } = state1;
  const logOptions = logger.buildBaseOptions(config, { coordinatorId: state1.id });

  logger.info(`Coordinator starting...`, logOptions);

  const workerOpts: WorkerOptions = {
    cloudProvider: config.nodeSettings.cloudProvider,
    airnodeAddressShort: state1.settings.airnodeAddressShort,
    stage: config.nodeSettings.stage,
    region: config.nodeSettings.region,
  };

  // =================================================================
  // STEP 2: Get the initial state from each provider
  // =================================================================
  // Should not throw
  const [initializeLogs, initializedStates] = await providers.initialize(coordinatorId, config, workerOpts);
  logger.logPending(initializeLogs, logOptions);

  const state2 = state.update(state1, { providerStates: { evm: initializedStates.evm } });
  state2.providerStates.evm.forEach((evmProvider) => {
    logger.info(`Initialized EVM provider:${evmProvider.settings.name}`, logOptions);
  });
  logger.info('Forking to initialize providers complete', logOptions);

  const hasNoRequests = state2.providerStates.evm.every((evmProvider) =>
    hasNoActionableRequests(evmProvider!.requests)
  );
  if (hasNoRequests) {
    logger.info('No actionable requests detected. Returning...', logOptions);
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
  const [callLogs, processedAggregatedApiCalls] = await calls.callApis(flatAggregatedCalls, logOptions, workerOpts);
  logger.logPending(callLogs, logOptions);

  const processedAggregatedApiCallsById = keyBy(processedAggregatedApiCalls, 'id');
  const state4 = state.update(state3, { aggregatedApiCallsById: processedAggregatedApiCallsById });

  // =================================================================
  // STEP 5: Map API responses back to each provider's API requests
  // =================================================================
  const [disaggregationLogs, providersWithAPIResponses] = calls.disaggregate(state4);
  logger.logPending(disaggregationLogs, logOptions);
  const state5 = state.update(state4, { providerStates: { evm: providersWithAPIResponses } });

  // =================================================================
  // STEP 6: Initiate transactions for each provider
  // =================================================================
  state5.providerStates.evm.map(async (evmProviderState) => {
    logger.info(`Forking to submit transactions for EVM provider:${evmProviderState.settings.name}...`, logOptions);
  });
  // Should not throw
  const [processedLogs, processedProviders] = await providers.processRequests(state5.providerStates, workerOpts);
  logger.logPending(processedLogs, logOptions);

  const state6 = state.update(state5, { providerStates: processedProviders });
  logger.info('Forking to submit transactions complete', logOptions);

  return state6;
}
