import { State } from '../state';

export function getCurrentBlockNumber(state: State) {
  return state.provider.getBlockNumber();
}
