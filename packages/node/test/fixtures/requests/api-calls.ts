import { ApiCall, ClientRequest } from '../../../src/types';

export function createApiCall(params?: Partial<ClientRequest<ApiCall>>): ClientRequest<ApiCall> {
  return {
    id: 'apiCallId',
    requesterId: 'requesterId',
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
    valid: true,
    walletIndex: '1',
    walletAddress: 'walletAddress',
    walletBalance: '100000',
    walletMinimumBalance: '50000',
    ...params,
  };
}
