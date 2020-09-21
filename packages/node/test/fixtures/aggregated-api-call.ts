import { AggregatedApiCall } from '../../src/types';

export function createAggregatedApiCall(params?: Partial<AggregatedApiCall>): AggregatedApiCall {
  return {
    endpointId: 'endpointId',
    endpointName: 'endpointName',
    id: 'apiCallId',
    oisTitle: 'oisTitle',
    parameters: { from: 'ETH' },
    providers: [0, 1],
    type: 'request',
    ...params,
  };
}
