import { ApiCall, ClientRequest, RequestStatus } from '../../../src/types';

export function createApiCall(params?: Partial<ClientRequest<ApiCall>>): ClientRequest<ApiCall> {
  // These fields have invalid values on purpose to allow for easier reading. When necessary,
  // they can be overridden with valid values
  return {
    id: 'apiCallId',
    clientAddress: 'clientAddress',
    designatedWallet: 'designatedWallet',
    endpointId: 'endpointId',
    fulfillAddress: 'fulfillAddress',
    fulfillFunctionId: 'fulfillFunctionId',
    encodedParameters: 'encodedParameters',
    metadata: {
      blockNumber: 10716082,
      transactionHash: 'logTransactionHash',
    },
    parameters: { from: 'ETH' },
    providerId: 'providerId',
    requestCount: '12',
    requesterIndex: '3',
    status: RequestStatus.Pending,
    templateId: null,
    type: 'regular',
    ...params,
  };
}
