import flatMap from 'lodash/flatMap';
import isEmpty from 'lodash/isEmpty';
import { goTimeout } from '../utils/promise-utils';
import * as providerStates from '../providers/state';
import { spawnNewProvider } from '../providers/worker';
import { ChainConfig, Config, EVMProviderState, ProviderState, WorkerOptions } from '../../types';

const PROVIDER_INITIALIZATION_TIMEOUT = 20_000;

function initializeEVMProvider(coordinatorId: string, config: Config, chain: ChainConfig, workerOpts: WorkerOptions) {
  return chain.providers.map(async (provider) => {
    const newState = providerStates.buildEVMState(coordinatorId, chain, provider, config);
    const initialization = spawnNewProvider(newState, workerOpts);

    // Each provider gets 20 seconds to initialize. If it fails to initialize
    // in this time, it is ignored.
    const [err, state] = await goTimeout(PROVIDER_INITIALIZATION_TIMEOUT, initialization);
    if (err || !state) {
      return null;
    }
    return state as ProviderState<EVMProviderState>;
  });
}

export async function initialize(coordinatorId: string, config: Config, workerOpts: WorkerOptions) {
  const { chains } = config.nodeSettings;

  if (isEmpty(chains)) {
    throw new Error('One or more chains must be defined in the provided config');
  }

  const EVMChains = chains.filter((c) => c.type === 'evm');

  // Providers are identified by their index in the array. This allows users
  // to configure duplicate providers safely (if they want the added redundancy)
  const EVMInitializations = flatMap(
    EVMChains.map((chain) => {
      return initializeEVMProvider(coordinatorId, config, chain, workerOpts);
    })
  );

  const providerStates = await Promise.all(EVMInitializations);
  const successfulProviders = providerStates.filter((ps) => !!ps) as ProviderState<EVMProviderState>[];
  return successfulProviders;
}
