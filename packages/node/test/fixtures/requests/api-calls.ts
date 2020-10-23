import { ApiCall, ClientRequest, RequestStatus } from '../../../src/types';

export function createApiCall(params?: Partial<ClientRequest<ApiCall>>): ClientRequest<ApiCall> {
  return {
    id: 'apiCallId',
    requesterAddress: 'requesterAddress',
    designatedWallet: 'designatedWallet',
    endpointId: 'endpointId',
    fulfillAddress: 'fulfillAddress',
    fulfillFunctionId: 'fulfillFunctionId',
    errorAddress: 'errorAddress',
    errorFunctionId: 'errorFunctionId',
    encodedParameters: 'encodedParameters',
    parameters: { from: 'ETH' },
    providerId: 'providerId',
    requesterIndex: 'requesterIndex',
    status: RequestStatus.Pending,
    metadata: {
      blockNumber: 10716082,
      transactionHash: 'logTransactionHash',
    },
    requestCount: '12',
    templateId: null,
    type: 'regular',
    // TODO: protocol-overhaul remove these
    requesterId: 'requesterId',
    walletIndex: '1',
    walletAddress: 'walletAddress',
    walletBalance: '100000',
    walletMinimumBalance: '50000',
    ...params,
  };
}
