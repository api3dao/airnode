import { ethers } from 'ethers';
import { RequestType, TransactionReceipt } from '../../../src/types';

export function buildTransactionReceipt(overrides?: Partial<TransactionReceipt>): TransactionReceipt {
  return {
    id: 'apiCallId',
    data: {
      chainId: 31337,
      data: '0xdata',
      hash: '0xtransactionId',
      gasLimit: ethers.BigNumber.from(500_000),
      gasPrice: ethers.BigNumber.from(1000),
      nonce: 5,
      value: ethers.BigNumber.from(1000),
    },
    type: RequestType.ApiCall,
    ...overrides,
  };
}
