import * as evm from './evm';

export * from './types';

// Wrap and re-export all EVM functions under the 'EVM' namespace
export const EVM = { ...evm };
