import { ChainConfig, ChainProvider, CoordindatorSettings, ProviderSettings } from '../../types';

export function create(chain: ChainConfig, provider: ChainProvider, coordinatorSettings: CoordindatorSettings): ProviderSettings {
  return {
    blockHistoryLimit: provider.blockHistoryLimit || 600,
    chainId: chain.id,
    chainType: 'evm',
    logFormat: coordinatorSettings.logFormat,
    minConfirmations: provider.minConfirmations || 6,
    name: provider.name,
    url: provider.url,
  };
}

