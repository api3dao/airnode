import flatMap from 'lodash/flatMap';
import isEmpty from 'lodash/isEmpty';
import { goTimeout } from '../utils/promise-utils';
import { randomString } from '../utils/string-utils';
import { spawnNewProvider } from '../providers/worker';
import { ChainConfig, CoordinatorState } from '../../types';

const PROVIDER_INITIALIZATION_TIMEOUT = 20_000;

async function initializeEVMProvider(coordinatorId: string, chain: ChainConfig) {
  return chain.providers.map(async (provider) => {
    const initialization = spawnNewProvider(coordinatorId, chain, provider);
    // Each provider gets 20 seconds to initialize. If it fails to initialize
    // in this time, it is ignored.
    const [err, state] = await goTimeout(PROVIDER_INITIALIZATION_TIMEOUT, initialization);
    if (err || !state) {
      return null;
    }
    return state;
  });
}

export async function initializeProviders(coordinatorId: string, chains: ChainConfig[]) {
  if (isEmpty(chains)) {
    throw new Error('One or more chains must be defined in config.json');
  }

  // Providers are identified by their index in the array. This allows users
  // to configure duplicate providers safely (if they want the added redundancy)
  const flatInitializations = flatMap(chains.map((chain) => {
    if (chain.type === 'evm') {
      return initializeEVMProvider(coordinatorId, chain);
    }

    throw new Error(`Unknown chain type: ${chain.type}`);
  }));

  const providerStates = await Promise.all(flatInitializations);
  const successfulProviders = providerStates.filter((ps) => !!ps);
  return successfulProviders;
}

export function create(): CoordinatorState {
  const coordinatorId = randomString(8);

  return {
    aggregatedApiCalls: [],
    id: coordinatorId,
    evmProviders: [],
    // TODO: allow the user to configure their preferred log format
    settings: { logFormat: 'plain' },
  };
}

export function update(state: CoordinatorState, newState: Partial<CoordinatorState>): CoordinatorState {
  return { ...state, ...newState };
}
