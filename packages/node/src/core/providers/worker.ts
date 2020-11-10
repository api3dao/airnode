import * as evmWorkers from '../evm/workers';
import { Config, EVMProviderState, ProviderState } from '../../types';

export async function spawnNewProvider(config: Config, state: ProviderState<any>) {
  if (state.settings.chainType === 'evm') {
    return evmWorkers.spawnNewProvider(config, state as ProviderState<EVMProviderState>);
  }

  throw new Error(`Unknown chain type: ${state.settings.chainType}`);
}

export async function spawnProviderRequestProcessor(config: Config, state: ProviderState<any>) {
  if (state.settings.chainType === 'evm') {
    return evmWorkers.spawnProviderRequestProcessor(config, state as ProviderState<EVMProviderState>);
  }

  throw new Error(`Unknown chain type: ${state.settings.chainType}`);
}
