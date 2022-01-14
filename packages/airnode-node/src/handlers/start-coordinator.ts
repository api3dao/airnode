import flatMap from 'lodash/flatMap';
import keyBy from 'lodash/keyBy';
import * as calls from '../coordinator/calls';
import * as logger from '../logger';
import * as providers from '../providers';
import { reportHeartbeat } from '../reporting';
import { hasNoActionableRequests } from '../requests/request';
import * as coordinatorState from '../coordinator/state';
import { formatDateTime, go } from '../utils';
import { Config, CoordinatorState, WorkerOptions } from '../types';

export async function startCoordinator(config: Config) {
  const startedAt = new Date();
  const endState = await coordinator(config);
  const completedAt = new Date();

  const durationMs = Math.abs(completedAt.getTime() - startedAt.getTime());
  const logOptions = logger.buildBaseOptions(config, { coordinatorId: endState.coordinatorId });
  logger.info(`Coordinator completed at ${formatDateTime(completedAt)}. Total time: ${durationMs}ms`, logOptions);

  // Heartbeat is not core part of coordinator because it may return early in case there are no actionable requests
  const [heartbeatError, _heartbeatRes] = await go(() => reportHeartbeat(endState));
  if (heartbeatError) {
    logger.error('Failed to send Airnode heartbeat', { ...logOptions, error: heartbeatError });
  }
}

function createInitialCoordinatorState(config: Config) {
  const state = coordinatorState.create(config);
  const { coordinatorId } = state;
  const logOptions = logger.buildBaseOptions(config, { coordinatorId });

  logger.info(`Created initial coordinator state`, logOptions);
  return state;
}

function getWorkerOptions(state: CoordinatorState): WorkerOptions {
  const { config, settings } = state;

  return {
    cloudProvider: config.nodeSettings.cloudProvider,
    airnodeAddressShort: settings.airnodeAddressShort,
    stage: config.nodeSettings.stage,
  };
}

async function initializeProviders(state: CoordinatorState) {
  const { coordinatorId, config } = state;
  const logOptions = logger.buildBaseOptions(config, { coordinatorId });

  logger.info('Forking to initialize providers', logOptions);
  const [logs, providerStates] = await providers.initialize(coordinatorId, config, getWorkerOptions(state));
  logger.logPending(logs, logOptions);
  logger.info('Forking to initialize providers complete', logOptions);

  const newState = coordinatorState.update(state, { providerStates });
  newState.providerStates.evm.forEach((evmProvider) => {
    logger.info(`Initialized EVM provider:${evmProvider.settings.name}`, logOptions);
  });
  return newState;
}

function hasCoordinatorNoActionableRequests(state: CoordinatorState) {
  const { providerStates } = state;

  return providerStates.evm.every((evmProvider) => hasNoActionableRequests(evmProvider!.requests));
}

function aggregateApiCalls(state: CoordinatorState) {
  const { providerStates, config, coordinatorId } = state;
  const logOptions = logger.buildBaseOptions(config, { coordinatorId });

  const flatApiCalls = flatMap(providerStates.evm, (provider) => provider.requests.apiCalls);
  const aggregatedApiCallsById = calls.aggregate(config, flatApiCalls);

  logger.info('Aggregated API calls', logOptions);
  return coordinatorState.update(state, { aggregatedApiCallsById });
}

async function executeApiCalls(state: CoordinatorState) {
  const { aggregatedApiCallsById, config, coordinatorId } = state;
  const logOptions = logger.buildBaseOptions(config, { coordinatorId });

  const aggregatedApiCalls = Object.values(aggregatedApiCallsById);
  const [logs, processedAggregatedApiCalls] = await calls.callApis(
    aggregatedApiCalls,
    logOptions,
    getWorkerOptions(state)
  );
  logger.logPending(logs, logOptions);

  logger.info('Executed API calls', logOptions);
  const processedAggregatedApiCallsById = keyBy(processedAggregatedApiCalls, 'id');
  return coordinatorState.update(state, { aggregatedApiCallsById: processedAggregatedApiCallsById });
}

function disaggregateApiCalls(state: CoordinatorState) {
  const { config, coordinatorId } = state;
  const logOptions = logger.buildBaseOptions(config, { coordinatorId });

  // TODO: Disaggregation should be chain agnostic - currently only updated EVM providers are returned
  const [logs, evmProvidersWithApiResponses] = calls.disaggregate(state);
  logger.logPending(logs, logOptions);

  logger.info('Disaggregated API calls', logOptions);
  return coordinatorState.update(state, { providerStates: { evm: evmProvidersWithApiResponses } });
}

async function initiateTransactions(state: CoordinatorState) {
  const { providerStates, config, coordinatorId } = state;
  const logOptions = logger.buildBaseOptions(config, { coordinatorId });

  const sponsorProviderStates = providers.splitStatesBySponsorAddress(providerStates);
  sponsorProviderStates.forEach((sponsorProviderState) => {
    logger.info(
      `Forking to submit transactions for EVM provider:${sponsorProviderState.settings.name} and sponsor wallet: ${sponsorProviderState.sponsorAddress}...`,
      logOptions
    );
  });

  // NOTE: Not merging responses and logs back (based on the provider, regardless sponsor wallet)
  // as the data don't go anywhere from here but be aware if that changes in the future.
  const [logs, processedProviders] = await providers.processRequests(sponsorProviderStates, getWorkerOptions(state));
  logger.logPending(logs, logOptions);

  logger.info('Forking to submit transactions complete', logOptions);
  return coordinatorState.update(state, { providerStates: processedProviders });
}

function applyChainRequestLimits(state: CoordinatorState) {
  const { config, coordinatorId, providerStates } = state;
  const logOptions = logger.buildBaseOptions(config, { coordinatorId });

  logger.info('Applying chain request limits', logOptions);
  const [logs, processedProviders] = calls.applyChainLimits(config, providerStates);
  logger.logPending(logs, logOptions);

  logger.info('Applied chain request limits', logOptions);
  return coordinatorState.update(state, { providerStates: processedProviders });
}

async function coordinator(config: Config): Promise<CoordinatorState> {
  // =================================================================
  // STEP 1: Create a blank coordinator state
  // =================================================================
  let state = createInitialCoordinatorState(config);

  // =================================================================
  // STEP 2: Create the initial state from each provider
  // =================================================================
  state = await initializeProviders(state);

  // =================================================================
  // STEP 3: Return early if there are no actionable requests
  // =================================================================
  if (hasCoordinatorNoActionableRequests(state)) {
    const { coordinatorId } = state;
    const logOptions = logger.buildBaseOptions(config, { coordinatorId });
    logger.info('No actionable requests detected. Returning', logOptions);
    return state;
  }

  // =================================================================
  // STEP 4: Apply chain limits and drop requests exceeding this limit
  // =================================================================
  state = applyChainRequestLimits(state);

  // =================================================================
  // STEP 5: Group API calls with respect to request IDs
  // =================================================================
  state = aggregateApiCalls(state);

  // =================================================================
  // STEP 6: Execute API calls and save the responses
  // =================================================================
  state = await executeApiCalls(state);

  // =================================================================
  // STEP 7: Map API responses back to each provider's API requests
  // =================================================================
  state = disaggregateApiCalls(state);

  // ======================================================================
  // STEP 8: Initiate transactions for each provider, sponsor wallet pair
  // ======================================================================
  state = await initiateTransactions(state);

  return state;
}
