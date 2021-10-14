import { RequestMetadata } from '../../../src/types';

export function buildMetadata(overrides?: Partial<RequestMetadata>): RequestMetadata {
  return {
    address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    blockNumber: 10716082,
    currentBlock: 10716090,
    ignoreBlockedRequestsAfterBlocks: 20,
    transactionHash: 'logTransactionHash',
    ...overrides,
  };
}
