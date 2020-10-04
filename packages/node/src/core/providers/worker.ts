import * as evm from '../evm';
import { ChainConfig, ChainProvider, InitialCoordinatorConfig, ProviderState } from '../../types';

export async function spawnNewProvider(chain: ChainConfig, provider: ChainProvider, coordinatorConfig: InitialCoordinatorConfig) {
  if (chain.type === 'evm') {
    return evm.spawnNewProvider(chain, provider, coordinatorConfig);
  }

  throw new Error(`Unknown chain type: ${chain.type}`);
}

export async function spawnProviderRequestProcessor(state: ProviderState<unknown>) {
  if (state.settings.chainType === 'evm') {
    return evm.spawnProviderRequestProcessor(state);
  }

  throw new Error(`Unknown chain type: ${chain.type}`);
}
