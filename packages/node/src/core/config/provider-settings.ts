import { CoordinatorOptions } from '../../types';

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
