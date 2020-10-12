import * as evm from '../evm';
import { NodeSettings } from '../../types';

export function validate(settings: NodeSettings) {
  const errorMsgs = settings.chains.reduce((acc, chain) => {
    if (chain.type === 'evm') {
      const contractMessages = evm.contracts.validate(chain);
      return [...acc, ...contractMessages];
    }

    throw new Error(`Unknown chain type: ${chain.type}`);
  }, []);

  return errorMsgs;
}
