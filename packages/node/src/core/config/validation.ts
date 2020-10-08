import * as evm from '../evm';
import { CoordinatorOptions } from '../../types';

export function validate(options?: CoordinatorOptions) {
  if (!options || !options.chains) {
    return [];
  }

  const errorMsgs = options.chains.reduce((acc, chain) => {
    if (chain.type === 'evm') {
      const messages = evm.contracts.validate(chain);
      return [...acc, ...messages];
    }

    throw new Error(`Unknown chain type: ${chain.type}`);
  }, []);

  return errorMsgs;
}
