import { buildMetadata } from './metadata';
import { ApiCall, Request, RequestStatus } from '../../../src/types';

export function buildApiCall(params?: Partial<Request<ApiCall>>): Request<ApiCall> {
  const metadata = buildMetadata();

  // These fields have invalid values on purpose to allow for easier reading. When necessary,
  // they can be overridden with valid values
  return {
    airnodeAddress: 'airnodeAddress',
    chainId: '31337',
    requesterAddress: 'requesterAddress',
    sponsorAddress: 'sponsorAddress',
    sponsorWallet: 'sponsorWallet',
    encodedParameters: 'encodedParameters',
    endpointId: 'endpointId',
    fulfillAddress: 'fulfillAddress',
    fulfillFunctionId: 'fulfillFunctionId',
    id: 'apiCallId',
    metadata,
    parameters: { from: 'ETH' },
    requestCount: '12',
    status: RequestStatus.Pending,
    templateId: null,
    type: 'regular',
    ...params,
  };
}

export function buildSubmittableApiCall(params?: Partial<Request<ApiCall>>): Request<ApiCall> {
  return {
    ...buildApiCall(),
    // Decodes to: '75051'
    responseValue: '0x000000000000000000000000000000000000000000000000000000000001252b',
    ...params,
  };
}
