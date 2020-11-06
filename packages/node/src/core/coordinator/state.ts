import { randomString } from '../utils/string-utils';
import { Config, CoordinatorState } from '../../types';

export function create(config: Config): CoordinatorState {
  const id = randomString(8);

  return {
    id,
    config,
    aggregatedApiCallsById: {},
    EVMProviders: [],
  };
}

export function update(state: CoordinatorState, newState: Partial<CoordinatorState>): CoordinatorState {
  return { ...state, ...newState };
}
