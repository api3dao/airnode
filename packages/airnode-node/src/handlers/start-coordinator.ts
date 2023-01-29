import flatMap from 'lodash/flatMap';
import keyBy from 'lodash/keyBy';
import isEmpty from 'lodash/isEmpty';
import pickBy from 'lodash/pickBy';
import { logger, formatDateTime, caching } from '@api3/airnode-utilities';
import { go } from '@api3/promise-utils';
import * as calls from '../coordinator/calls';
import * as providers from '../providers';
import { reportHeartbeat } from '../reporting';
import { hasNoActionableRequests } from '../requests/request';
import * as coordinatorState from '../coordinator/state';
import {
  CoordinatorState,
  CoordinatorStateWithApiResponses,
  WorkerOptions,
  RegularApiCallSuccessResponse,
  RegularAggregatedApiCallWithResponse,
  RegularAggregatedApiCallsById,
} from '../types';
import { Config } from '../config';
import { getReservedParameterValue } from '../adapters/http/parameters';
import { BLOCK_COUNT_HISTORY_LIMIT } from '../constants';

export async function startCoordinator(config: Config, coordinatorId: string) {
  const startedAt = new Date();
  const endState = await coordinator(config, coordinatorId);
  const completedAt = new Date();

  const durationMs = Math.abs(completedAt.getTime() - startedAt.getTime());
  logger.info(`Coordinator completed at ${formatDateTime(completedAt)}. Total time: ${durationMs}ms`);

  // Heartbeat is not core part of coordinator because it may return early in case there are no actionable requests
  const goHeartbeatRes = await go(() => reportHeartbeat(endState));
  if (!goHeartbeatRes.success) {
    logger.error('Failed to send Airnode heartbeat', goHeartbeatRes.error);
  }
}

function createInitialCoordinatorState(config: Config, coordinatorId: string) {
  const state = coordinatorState.create(config, coordinatorId);

  logger.info(`Created initial coordinator state`);
  return state;
}

function getWorkerOptions(state: CoordinatorState): WorkerOptions {
  const { config, settings } = state;

  return {
    cloudProvider: config.nodeSettings.cloudProvider,
    deploymentId: settings.deploymentId,
  };
}

async function initializeProviders(state: CoordinatorState) {
  const { coordinatorId, config, settings } = state;

  logger.info('Forking to initialize providers');
  const [logs, providerStates] = await providers.initialize(
    coordinatorId,
    settings.airnodeAddress,
    config,
    getWorkerOptions(state)
  );
  logger.logPending(logs);
  logger.info('Forking to initialize providers complete');

  const newState = coordinatorState.update(state, { providerStates });
  const evmProviders = newState.providerStates.evm;
  if (isEmpty(evmProviders)) {
    logger.info('No providers found');
  } else {
    evmProviders.forEach((evmProvider) => {
      logger.info(`Initialized EVM provider:${evmProvider.settings.name}`);
    });
  }

  return newState;
}

function hasCoordinatorNoActionableRequests(state: CoordinatorState) {
  const { providerStates } = state;

  return providerStates.evm.every((evmProvider) => hasNoActionableRequests(evmProvider!.requests));
}

export function filterByMinConfirmations(state: CoordinatorState) {
  const { config, aggregatedApiCallsById } = state;
  const filteredApiCalls = Object.entries(aggregatedApiCallsById).reduce(
    (acc: RegularAggregatedApiCallsById, [id, aggregatedApiCall]) => {
      const { endpointName, metadata, oisTitle, parameters } = aggregatedApiCall;
      const ois = config.ois.find((o) => o.title === oisTitle)!;
      const endpoint = ois.endpoints.find((e) => e.name === endpointName)!;
      const _minConfirmations = getReservedParameterValue('_minConfirmations', endpoint, parameters);
      // _minConfirmations request parameter overrides chains[n].minConfirmations
      if (_minConfirmations) {
        const numMinConfirmations = Number(_minConfirmations);

        if (isNaN(numMinConfirmations) || !Number.isInteger(numMinConfirmations)) {
          const msg = `Parameter "_minConfirmations" value ${numMinConfirmations} could not be parsed as an integer`;
          logger.error(msg);
          return acc;
        }
        if (numMinConfirmations > BLOCK_COUNT_HISTORY_LIMIT) {
          const msg = `Parameter "_minConfirmations" value ${numMinConfirmations} cannot be greater than BLOCK_COUNT_HISTORY_LIMIT value ${BLOCK_COUNT_HISTORY_LIMIT}`;
          logger.error(msg);
          return acc;
        }

        // filter requests based on _minConfirmations requested relative to number of block confirmations
        if (metadata.currentBlock - metadata.blockNumber < numMinConfirmations) {
          const msg = `Dropping Request ID:${aggregatedApiCall.id} as it hasn't had ${numMinConfirmations} block confirmations`;
          logger.info(msg);
          return acc;
        }
      } else {
        // filter requests based on chains[n].minConfirmations relative to number of block confirmations
        const { chainId } = aggregatedApiCall;
        const configMinConfirmations = Number(config.chains.find((c) => c.id === chainId)!.minConfirmations);
        if (aggregatedApiCall.metadata.currentBlock - aggregatedApiCall.metadata.blockNumber < configMinConfirmations) {
          const msg = `Dropping Request ID:${aggregatedApiCall.id} as it hasn't had ${configMinConfirmations} block confirmations`;
          logger.info(msg);
          return acc;
        }
      }
      return { ...acc, [id]: aggregatedApiCall };
    },
    {}
  );

  return coordinatorState.update(state, { aggregatedApiCallsById: filteredApiCalls });
}

function aggregateApiCalls(state: CoordinatorState) {
  const { providerStates, config } = state;

  const flatApiCalls = flatMap(providerStates.evm, (provider) => provider.requests.apiCalls);
  const aggregatedApiCallsById = calls.aggregate(config, flatApiCalls);

  logger.info('Aggregated API calls');
  return coordinatorState.update(state, { aggregatedApiCallsById });
}

async function executeApiCalls(state: CoordinatorState) {
  const { aggregatedApiCallsById } = state;

  const cachedKeys = caching.getKeys('requestId-');

  const filteredUncachedAggregatedApiCalls = pickBy(
    aggregatedApiCallsById,
    (_value, key) => !cachedKeys.includes(`requestId-${key}`)
  );

  const filteredCachedAggregatedApiCalls: RegularAggregatedApiCallWithResponse[] = Object.entries(
    aggregatedApiCallsById
  )
    .filter(([id, _value]) => cachedKeys.includes(`requestId-${id}`))
    .map(([id, apiCall]) => {
      const data = caching.getValueForKey(`requestId-${id}`);
      return {
        ...apiCall,
        data,
        // only previously successful API calls are cached
        success: true,
      };
    });

  const aggregatedApiCalls = Object.values(filteredUncachedAggregatedApiCalls);

  const [logs, processedAggregatedApiCalls] = await calls.callApis(aggregatedApiCalls, getWorkerOptions(state));
  logger.logPending(logs);

  processedAggregatedApiCalls
    .filter((call) => call.success && call.cacheResponses)
    .forEach((call) => {
      caching.addKey(`requestId-${call.id}`, (call as RegularApiCallSuccessResponse).data);
    });

  caching.syncFsSync();

  const mergedProcessedAggregatedApiCalls = [...processedAggregatedApiCalls, ...filteredCachedAggregatedApiCalls];

  logger.info('Executed API calls');
  const processedAggregatedApiCallsById = keyBy(mergedProcessedAggregatedApiCalls, 'id');
  return coordinatorState.update(state, {
    aggregatedApiCallsById: processedAggregatedApiCallsById,
  }) as CoordinatorStateWithApiResponses;
}

function disaggregateApiCalls(state: CoordinatorStateWithApiResponses) {
  // TODO: Disaggregation should be chain agnostic - currently only updated EVM providers are returned
  const [logs, evmProvidersWithApiResponses] = calls.disaggregate(state);
  logger.logPending(logs);

  logger.info('Disaggregated API calls');
  return coordinatorState.update(state, { providerStates: { evm: evmProvidersWithApiResponses } });
}

async function initiateTransactions(state: CoordinatorStateWithApiResponses) {
  const { providerStates } = state;

  const sponsorProviderStates = providers.splitStatesBySponsorAddress(providerStates);
  sponsorProviderStates.forEach((sponsorProviderState) => {
    logger.info(
      `Forking to submit transactions for EVM provider: ${sponsorProviderState.settings.name} and sponsor: ${sponsorProviderState.sponsorAddress}...`
    );
  });

  // NOTE: Not merging responses and logs back (based on the provider, regardless of sponsor)
  // as the data don't go anywhere from here but be aware if that changes in the future.
  const [logs, processedProviders] = await providers.processRequests(sponsorProviderStates, getWorkerOptions(state));
  logger.logPending(logs);

  logger.info('Forking to submit transactions complete');
  return coordinatorState.update(state, { providerStates: processedProviders });
}

function applyChainRequestLimits(state: CoordinatorState) {
  const { config, providerStates } = state;

  logger.info('Applying chain request limits');
  const [logs, processedProviders] = calls.applyChainLimits(config, providerStates);
  logger.logPending(logs);

  logger.info('Applied chain request limits');
  return coordinatorState.update(state, { providerStates: processedProviders });
}

async function coordinator(config: Config, coordinatorId: string): Promise<CoordinatorState> {
  caching.initPath();

  // =================================================================
  // STEP 1: Create a blank coordinator state
  // =================================================================
  let state = createInitialCoordinatorState(config, coordinatorId);

  // =================================================================
  // STEP 2: Create the initial state from each provider
  // =================================================================
  state = await initializeProviders(state);

  // =================================================================
  // STEP 3: Return early if there are no actionable requests
  // =================================================================
  if (hasCoordinatorNoActionableRequests(state)) {
    logger.info('No actionable requests detected. Returning');
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
  // STEP 6: Drop requests that haven't had (_)minConfirmations
  // =================================================================
  state = filterByMinConfirmations(state);

  // =================================================================
  // STEP 7: Execute API calls and save the responses
  // =================================================================
  let stateWithResponses = await executeApiCalls(state);

  // =================================================================
  // STEP 8: Map API responses back to each provider's API requests
  // =================================================================
  stateWithResponses = disaggregateApiCalls(stateWithResponses);

  // ======================================================================
  // STEP 9: Initiate transactions for each provider, sponsor pair
  // ======================================================================
  stateWithResponses = await initiateTransactions(stateWithResponses);

  return stateWithResponses;
}
