import flatMap from 'lodash/flatMap';
import isEmpty from 'lodash/isEmpty';
import { goTimeout } from '../utils/promise-utils';
import * as providerStates from '../providers/state';
import { spawnNewProvider } from '../providers/worker';
import { ChainConfig, Config, EVMProviderState, ProviderState } from '../../types';

const PROVIDER_INITIALIZATION_TIMEOUT = 20_000;

function initializeEVMProvider(coordinatorId: string, chain: ChainConfig, config: Config) {
  return chain.providers.map(async (provider) => {
    const freshState = providerStates.createEVMState(coordinatorId, chain, provider, config);
    const initialization = spawnNewProvider(freshState);

    // Each provider gets 20 seconds to initialize. If it fails to initialize
    // in this time, it is ignored.
    const [err, state] = await goTimeout(PROVIDER_INITIALIZATION_TIMEOUT, initialization);
    if (err || !state) {
      return null;
    }
    return state;
  });
}

export async function initialize(coordinatorId: string, chains: ChainConfig[], config: Config) {
  if (isEmpty(chains)) {
    throw new Error('One or more chains must be defined in config.json');
  }

  const EVMChains = chains.filter((c) => c.type === 'evm');

  // Providers are identified by their index in the array. This allows users
  // to configure duplicate providers safely (if they want the added redundancy)
  const EVMInitializations = flatMap(
    EVMChains.map((chain) => {
      return initializeEVMProvider(coordinatorId, chain, config);
    })
  );

  const providerStates = await Promise.all(EVMInitializations);
  const successfulProviders = providerStates.filter((ps) => !!ps) as ProviderState<EVMProviderState>[];
  return successfulProviders;
}
