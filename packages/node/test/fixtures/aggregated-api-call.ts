import { AggregatedApiCall } from '../../src/types';

export function createAggregatedApiCall(params?: Partial<AggregatedApiCall>): AggregatedApiCall {
  return {
    endpointId: 'endpointId',
    endpointName: 'convertToUSD',
    id: 'apiCallId',
    oisTitle: 'currency-converter-ois',
    parameters: { from: 'ETH' },
    type: 'request',
    ...params,
  };
}
