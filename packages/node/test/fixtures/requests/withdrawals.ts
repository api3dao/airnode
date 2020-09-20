import { BaseRequest, ClientRequest, RequestStatus, Withdrawal } from '../../../src/types';

export function createBaseWithdrawal(params?: Partial<BaseRequest<Withdrawal>>): BaseRequest<Withdrawal> {
  return {
    id: 'withdrawalId',
    requesterId: 'requesterId',
    destinationAddress: 'destinationAddress',
    providerId: 'providerId',
    status: RequestStatus.Pending,
    metadata: {
      blockNumber: 10716082,
      transactionHash: 'logTransactionHash',
    },
    ...params,
  };
}

export function createWithdrawal(params?: Partial<ClientRequest<Withdrawal>>): ClientRequest<Withdrawal> {
  return {
    ...createBaseWithdrawal(),
    walletIndex: '12',
    walletAddress: 'walletAddress',
    walletBalance: '100000',
    walletMinimumBalance: '500000',
    ...params,
  };
}
