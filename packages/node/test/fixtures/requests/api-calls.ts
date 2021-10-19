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
    sponsorWalletAddress: 'sponsorWalletAddress',
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
    type: 'template',
    ...params,
  };
}

export function buildSubmittableApiCall(params?: Partial<Request<ApiCall>>): Request<ApiCall> {
  return {
    ...buildApiCall(),
    // Decodes to: '75051'
    id: '0xb56b66dc089eab3dc98672ea5e852488730a8f76621fd9ea719504ea205980f8',
    responseValue: '0x000000000000000000000000000000000000000000000000000000000001252b',
    ...params,
  };
}
