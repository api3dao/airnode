import { RequestMetadata } from '../../../src/types';

export function buildMetadata(overrides?: Partial<RequestMetadata>): RequestMetadata {
  return {
    blockNumber: 10716082,
    currentBlock: 10716090,
    ignoreBlockedRequestsAfterBlocks: 20,
    transactionHash: 'logTransactionHash',
    ...overrides,
  };
}
