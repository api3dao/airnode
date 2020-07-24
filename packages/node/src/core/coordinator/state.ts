import isEmpty from 'lodash/isEmpty';
import { goTimeout } from '../utils/promise-utils';
import { ProviderConfig, ProviderState, State } from '../../types';
import { spawnNewProvider } from '../providers/worker';

export async function initialize(providerConfigs: ProviderConfig[]): Promise<State> {
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

  return { providers: successfulProviders };
}

export function update(state: State, newState: any): State {
  return { ...state, ...newState };
}
