import * as ethereum from './ethereum';
import { promiseTimeout } from './utils/promise-utils';
import { ProviderConfig, ProviderState, State } from '../types';

export async function initialize(providerConfigs: ProviderConfig[]): Promise<State> {
  const providerInitializations = providerConfigs.map(providerConfig => {
    const initialization = ethereum.initializeProviderState(providerConfig);
    return promiseTimeout(10_000, initialization).catch(() => null);
  });
  const providerStates = await Promise.all(providerInitializations);

  const successfulProviders = providerStates.filter(ps => !!ps) as ProviderState[];

  return { providers: successfulProviders };
}

export function update(state: State, newState: any): State {
  return { ...state, ...newState };
}
