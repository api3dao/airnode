import { randomString } from '../utils/string-utils';
import { CoordinatorState, NodeSettings } from '../../types';

export function create(settings: NodeSettings): CoordinatorState {
  const id = randomString(8);

  return {
    settings,
    id,
    aggregatedApiCallsById: {},
    EVMProviders: [],
  };
}

export function update(state: CoordinatorState, newState: Partial<CoordinatorState>): CoordinatorState {
  return { ...state, ...newState };
}
