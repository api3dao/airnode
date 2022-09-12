import * as evmWorkers from '../evm/workers';
import { EVMProviderState, EVMProviderSponsorState, ProviderState, WorkerOptions } from '../types';

export function spawnNewProvider(state: ProviderState<any>, workerOpts: WorkerOptions) {
  if (state.settings.chainType === 'evm') {
    return evmWorkers.spawnNewProvider(state as ProviderState<EVMProviderState>, workerOpts);
  }

  throw new Error(`Unknown chain type: ${state.settings.chainType}`);
}

export function spawnProviderRequestProcessor(state: ProviderState<any>, workerOpts: WorkerOptions) {
  if (state.settings.chainType === 'evm') {
    return evmWorkers.spawnProviderRequestProcessor(state as ProviderState<EVMProviderSponsorState>, workerOpts);
  }

  throw new Error(`Unknown chain type: ${state.settings.chainType}`);
}
