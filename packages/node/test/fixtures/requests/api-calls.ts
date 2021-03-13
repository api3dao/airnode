import { ApiCall, ClientRequest, RequestStatus } from '../../../src/types';
import { buildMetadata } from './metadata';

export function buildApiCall(params?: Partial<ClientRequest<ApiCall>>): ClientRequest<ApiCall> {
  const metadata = buildMetadata();

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
    metadata,
    parameters: { from: 'ETH' },
    airnodeId: 'airnodeId',
    requestCount: '12',
    requesterIndex: '3',
    status: RequestStatus.Pending,
    templateId: null,
    type: 'regular',
    ...params,
  };
}

export function buildSubmittableApiCall(params?: Partial<ClientRequest<ApiCall>>): ClientRequest<ApiCall> {
  return {
    ...buildApiCall(),
    // Decodes to: '75051'
    responseValue: '0x000000000000000000000000000000000000000000000000000000000001252b',
    ...params,
  };
}
