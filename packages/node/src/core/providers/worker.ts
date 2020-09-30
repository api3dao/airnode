import * as evm from '../evm';
import { ChainConfig, ChainProvider, ProviderState } from '../../types';

export async function spawnNewProvider(coordinatorId: string, chain: ChainConfig, provider: ChainProvider) {
  if (chain.type === 'evm') {
    return evm.spawnNewProvider(coordinatorId, chain, provider);
  }

  throw new Error(`Unknown chain type: ${chain.type}`);
}

export async function spawnProviderRequestProcessor(state: ProviderState<unknown>) {
  if (state.type === 'evm') {
    return evm.spawnProviderRequestProcessor(state);
  }

  throw new Error(`Unknown chain type: ${chain.type}`);
}
