import { ApiCall, BaseRequest, ClientRequest, RequestStatus } from '../../../src/types';

export function createBaseApiCall(params?: Partial<BaseRequest<ApiCall>>): BaseRequest<ApiCall> {
  return {
    id: 'apiCallId',
    requesterAddress: 'requesterAddress',
    endpointId: 'endpointId',
    templateId: null,
    fulfillAddress: 'fulfillAddress',
    fulfillFunctionId: 'fulfillFunctionId',
    errorAddress: 'errorAddress',
    errorFunctionId: 'errorFunctionId',
    encodedParameters: 'encodedParameters',
    parameters: { from: 'ETH' },
    providerId: 'providerId',
    status: RequestStatus.Pending,
    logMetadata: {
      blockNumber: 10716082,
      transactionHash: 'logTransactionHash',
    },
    ...params,
  };
}

export function createApiCall(params?: Partial<ClientRequest<ApiCall>>): ClientRequest<ApiCall> {
  return {
    ...createBaseApiCall(params),
    requesterId: 'requesterId',
    walletIndex: '1',
    walletAddress: 'walletAddress',
    walletBalance: '100000',
    walletMinimumBalance: '50000',
    ...params,
  };
}
