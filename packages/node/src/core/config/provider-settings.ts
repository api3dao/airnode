import * as evm from '../evm/settings';
import { ChainConfig, ChainProvider, CoordinatorOptions, EVMSettings, ProviderSettings } from '../../types';

export function create(chain: ChainConfig, provider: ChainProvider) {
  switch (chain.type) {
    case 'evm':
      return evm.create(chain, provider) as ProviderSettings<EVMSettings>;

    default:
      throw new Error(`Unknown chain type:${chain.type}`);
  }
}

export function validate(options?: CoordinatorOptions) {
  if (!options || !options.chains) {
    return [];
  }

  const errorMsgs = options.chains.reduce((acc, chain) => {
    if (chain.type === 'evm') {
      const messages = evm.validate(chain);
      return [...acc, ...messages];
    }

    throw new Error(`Unknown chain type: ${chain.type}`);
  }, []);

  return errorMsgs;
}
