import * as evmWorkers from '../evm/workers';
import { EVMProviderState, ProviderState } from '../../types';

export async function spawnNewProvider(state: ProviderState<EVMProviderState>) {
  if (state.settings.chainType === 'evm') {
    return evmWorkers.spawnNewProvider(state);
  }

  throw new Error(`Unknown chain type: ${state.settings.chainType}`);
}

export async function spawnProviderRequestProcessor(state: ProviderState<any>) {
  if (state.settings.chainType === 'evm') {
    return evmWorkers.spawnProviderRequestProcessor(state as ProviderState<EVMProviderState>);
  }

  throw new Error(`Unknown chain type: ${state.settings.chainType}`);
}
