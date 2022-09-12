import flatMap from 'lodash/flatMap';
import map from 'lodash/map';
import omit from 'lodash/omit';
import { logger } from '@api3/airnode-utilities';
import { go } from '@api3/promise-utils';
import { buildEVMState } from './state';
import { spawnNewProvider, spawnProviderRequestProcessor } from './worker';
import {
  EVMProviderState,
  EVMProviderSponsorState,
  LogsData,
  ProviderState,
  ProviderStates,
  WorkerOptions,
} from '../types';
import { WORKER_PROVIDER_INITIALIZATION_TIMEOUT, WORKER_PROCESS_TRANSACTIONS_TIMEOUT } from '../constants';
import { Config } from '../config';

async function initializeEVMProvider(
  state: ProviderState<EVMProviderState>,
  workerOpts: WorkerOptions
): Promise<LogsData<ProviderState<EVMProviderState> | null>> {
  const initialization = () => spawnNewProvider(state, workerOpts);

  // Each provider gets 20 seconds to initialize. If it fails to initialize
  // in this time, it is ignored. It is important to catch any potential errors
  // here as a single promise rejecting will cause Promise.all to reject
  const goLogsWithRes = await go(initialization, {
    totalTimeoutMs: WORKER_PROVIDER_INITIALIZATION_TIMEOUT,
  });
  if (!goLogsWithRes.success) {
    const log = logger.pend('ERROR', `Unable to initialize provider:${state.settings.name}`, goLogsWithRes.error);
    return [[log], null];
  }
  return goLogsWithRes.data;
}

export async function initialize(
  coordinatorId: string,
  airnodeAddress: string,
  config: Config,
  workerOpts: WorkerOptions
): Promise<LogsData<ProviderStates>> {
  const { chains } = config;
  const evmChains = chains.filter((c) => c.type === 'evm');

  // Providers are identified by their index in the array. This allows users
  // to configure duplicated providers safely (if they want the added redundancy)
  const evmInitializations = flatMap(
    evmChains.map((chain) => {
      return map(chain.providers, (_, providerName) => {
        const state = buildEVMState(coordinatorId, airnodeAddress, chain, providerName, config);
        return initializeEVMProvider(state, workerOpts);
      });
    })
  );

  const evmProviderStates = await Promise.all(evmInitializations);
  const logs = flatMap(evmProviderStates.map((ps) => ps[0]));
  const successfulResponses = evmProviderStates.filter((ps) => !!ps[1]);
  const successfulEvmProviders = successfulResponses.map((ps) => ps[1]) as ProviderState<EVMProviderState>[];

  return [logs, { evm: successfulEvmProviders }];
}

async function processEvmProviderRequests(
  state: ProviderState<EVMProviderSponsorState>,
  workerOpts: WorkerOptions
): Promise<LogsData<ProviderState<EVMProviderSponsorState> | null>> {
  const goLogsWithRes = await go(() => spawnProviderRequestProcessor(state, workerOpts), {
    totalTimeoutMs: WORKER_PROCESS_TRANSACTIONS_TIMEOUT,
  });
  if (!goLogsWithRes.success) {
    const log = logger.pend('ERROR', `Unable to process provider:${state.settings.name} requests`, goLogsWithRes.error);
    return [[log], null];
  }
  return goLogsWithRes.data;
}

export async function processRequests(
  sponsorProviderStates: ProviderState<EVMProviderSponsorState>[],
  workerOpts: WorkerOptions
): Promise<LogsData<ProviderStates>> {
  const processEvmProviderSponsorPairs = sponsorProviderStates.map((sponsorProviderState) =>
    processEvmProviderRequests(sponsorProviderState, workerOpts)
  );
  const evmProviderSponsorStates = await Promise.all(processEvmProviderSponsorPairs);

  const logs = flatMap(evmProviderSponsorStates, (ps) => ps[0]);
  const successfulResponses = evmProviderSponsorStates.filter((ps) => !!ps[1]);
  const successfulEvmProviderSponsors = successfulResponses.map((ps) => ps[1]);

  // NOTE: It's possible that a provider fails (returns null), so we need to merge the successful responses
  // with the existing provider states to avoid losing anything.
  const allEvmProviders = sponsorProviderStates.map((existingState) => {
    const successfulResponse = successfulEvmProviderSponsors.find((ps) => ps && ps.id === existingState.id);
    return omit(successfulResponse || existingState, 'sponsorWallet');
  });

  return [logs, { evm: allEvmProviders }];
}
