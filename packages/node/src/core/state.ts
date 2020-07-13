import isEmpty from 'lodash/isEmpty';
import * as ethereum from './ethereum';
import { promiseTimeout } from './utils/promise-utils';
import { ProviderConfig, ProviderState, State } from '../types';

export async function initialize(providerConfigs: ProviderConfig[]): Promise<State> {
  if (isEmpty(providerConfigs)) {
    throw new Error('At least one provider must be defined in config.json');
  }

  // Initialize each provider state (in parallel) with a maximum time limit of 10 seconds
  const providerInitializations = providerConfigs.map((providerConfig) => {
    const initialization = ethereum.initializeProviderState(providerConfig);
    return promiseTimeout(10_000, initialization).catch(() => null);
  });
  const providerStates = await Promise.all(providerInitializations);

  const successfulProviders = providerStates.filter((ps) => !!ps) as ProviderState[];

  return { providers: successfulProviders };
}

export function update(state: State, newState: any): State {
  return { ...state, ...newState };
}
