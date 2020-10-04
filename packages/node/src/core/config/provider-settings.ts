import { ChainConfig, ChainProvider, CoordinatorOptions, InitialCoordinatorConfig, ProviderSettings } from '../../types';

export function createEVMSettings(chain: ChainConfig, provider: ChainProvider, coordinatorConfig: InitialCoordinatorConfig): ProviderSettings {
  return {
    blockHistoryLimit: provider.blockHistoryLimit || 600,
    chainId: chain.id,
    chainType: 'evm',
    logFormat: coordinatorConfig.logFormat,
    minConfirmations: provider.minConfirmations || 6,
    name: provider.name,
    url: provider.url,
  };
}


export function create(chain: ChainConfig, provider: ChainProvider, coordinatorConfig: InitialCoordinatorConfig) {
  switch (chain.type) {
    case 'evm':
      return createEVMSettings(chain, provider, coordinatorConfig);

    default:
      throw new Error(`Unknown chain type:${chain.type}`);
  }
}

export function validate(_options?: CoordinatorOptions) {
  // TODO: validate contracts
  return [];
  // if (!options || !options.chains) {
  //   return [];
  // }
  //
  // const errorMsgs = options.chains.reduce((acc, chain) => {
  //   if (chain.type === 'evm') {
  //     const messages = evm.validate(chain);
  //     return [...acc, ...messages];
  //   }
  //
  //   throw new Error(`Unknown chain type: ${chain.type}`);
  // }, []);
  //
  // return errorMsgs;
}
