import { AggregatedApiCall } from '../../src/types';

export function createAggregatedApiCall(params?: Partial<AggregatedApiCall>): AggregatedApiCall {
  return {
    endpointId: 'endpointId',
    endpointName: 'convertToUsd',
    id: 'apiCallId',
    oisTitle: 'oisTitle',
    parameters: { from: 'ETH' },
    type: 'request',
    ...params,
  };
}
