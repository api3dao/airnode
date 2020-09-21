import { BaseRequest, RequestStatus, WalletDesignation } from '../../../src/types';

export function createWalletDesignation(
  params?: Partial<BaseRequest<WalletDesignation>>
): BaseRequest<WalletDesignation> {
  return {
    id: 'walletDesignationId',
    depositAmount: '2000000',
    providerId: 'providerId',
    requesterId: 'requesterId',
    walletIndex: '5',
    status: RequestStatus.Pending,
    metadata: {
      blockNumber: 10716082,
      providerIndex: 0,
      transactionHash: 'logTransactionHash',
    },
    ...params,
  };
}
