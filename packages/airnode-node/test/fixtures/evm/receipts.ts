import { ethers } from 'ethers';
import { RequestType, TransactionReceipt } from '../../../src/types';

export function buildTransactionReceipt(overrides?: Partial<TransactionReceipt>): TransactionReceipt {
  return {
    id: '0xb56b66dc089eab3dc98672ea5e852488730a8f76621fd9ea719504ea205980f8', //apiCallId
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
