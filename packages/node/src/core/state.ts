import isEmpty from 'lodash/isEmpty';
import { goTimeout } from './utils/promise-utils';
import { ProviderConfig, ProviderState, State } from '../types';
import * as forkingProviders from './forking/providers';

export async function initialize(providerConfigs: ProviderConfig[]): Promise<State> {
  if (isEmpty(providerConfigs)) {
    throw new Error('At least one provider must be defined in config.json');
  }

  // Initialize each provider state (in parallel) with a maximum time limit of 10 seconds
  const providerInitializations = providerConfigs.map(async (_config, index) => {
    const initialization = forkingProviders.initialize(index);
    const [err, state] = await goTimeout(10_000, initialization);
    if (err) {
      return null;
    }
    return state;
  });
  const providerStates = await Promise.all(providerInitializations);

  const successfulProviders = providerStates.filter((ps) => !!ps) as ProviderState[];

  return { providers: successfulProviders };
}

export function update(state: State, newState: any): State {
  return { ...state, ...newState };
}
