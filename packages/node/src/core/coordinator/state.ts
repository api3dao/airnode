import flatMap from 'lodash/flatMap';
import isEmpty from 'lodash/isEmpty';
import { goTimeout } from '../utils/promise-utils';
import * as logger from '../logger';
import { spawnNewProvider } from '../providers/worker';
import { ChainConfig, CoordinatorState } from '../../types';

export async function initializeProviders(chains: ChainConfig[]) {
  if (isEmpty(chains)) {
    throw new Error('One or more chains must be defined in config.json');
  }

  // Providers are identified by their index in the array. This allows users
  // to configure duplicate providers safely (if they want the added redundancy)
  const flatInitializations = flatMap(chains.map((chain) => {
    const chainInitializations = chain.providers.map(async (provider) => {
      logger.logJSON('INFO', `Forking to initialize ${chain.type.toUpperCase()} provider:${provider.name} (chain:${chain.id})...`);

      const initialization = spawnNewProvider(chain, provider);
      // Each provider gets 20 seconds to initialize. If it fails to initialize
      // in this time, it is ignored.
      const [err, state] = await goTimeout(20_000, initialization);
      if (err || !state) {
        return null;
      }
      return state;
    });

    return chainInitializations;
  }));

  const providerStates = await Promise.all(flatInitializations);
  const successfulProviders = providerStates.filter((ps) => !!ps);
  return successfulProviders;
}

export function create(): CoordinatorState {
  return {
    aggregatedApiCalls: [],
    providers: [],
  };
}

export function update(state: CoordinatorState, newState: Partial<CoordinatorState>): CoordinatorState {
  return { ...state, ...newState };
}
