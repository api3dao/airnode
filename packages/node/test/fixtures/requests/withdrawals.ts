import { ClientRequest, RequestStatus, Withdrawal } from '../../../src/types';

export function createWithdrawal(params?: Partial<ClientRequest<Withdrawal>>): ClientRequest<Withdrawal> {
  return {
    id: 'withdrawalId',
    requesterId: 'requesterId',
    destinationAddress: 'destinationAddress',
    providerId: 'providerId',
    status: RequestStatus.Pending,
    walletIndex: '12',
    walletAddress: 'walletAddress',
    walletBalance: '100000',
    walletMinimumBalance: '500000',
    logMetadata: {
      blockNumber: 10716082,
      transactionHash: 'logTransactionHash',
    },
    ...params,
  };
}
