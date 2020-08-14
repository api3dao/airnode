import isEmpty from 'lodash/isEmpty';
import { goTimeout } from '../utils/promise-utils';
import { CoordinatorState, ProviderConfig, ProviderState } from '../../types';
import { spawnNewProvider } from '../providers/worker';

export async function initializeProviders(providerConfigs: ProviderConfig[]): Promise<ProviderState[]> {
  if (isEmpty(providerConfigs)) {
    throw new Error('At least one provider must be defined in config.json');
  }

  // Providers are identified by their index in the array. This allows users
  // to configure duplicate providers safely (if they want the added redundancy)
  const initializations = providerConfigs.map(async (_config, index) => {
    const initialization = spawnNewProvider(index);
    // Each provider gets 20 seconds to initialize. If it fails to initialize
    // in this time, it is ignored.
    const [err, state] = await goTimeout(20_000, initialization);
    if (err) {
      return null;
    }
    return state;
  });
  const providerStates = await Promise.all(initializations);

  const successfulProviders = providerStates.filter((ps) => !!ps) as ProviderState[];

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
