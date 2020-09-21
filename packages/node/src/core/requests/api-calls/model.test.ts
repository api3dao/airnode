import * as fixtures from 'test/fixtures';
import * as model from './model';
import { AggregatedApiCall, RequestErrorCode, RequestStatus } from '../../../types';

describe('isDuplicate', () => {
  it('compares the relevant API call attributes to the aggregated API call', () => {
    const apiCall = fixtures.requests.createApiCall({
      id: '0x123',
      endpointId: '0x987',
      parameters: { from: 'ETH', to: 'USDC' },
    });

    const baseAggregatedCall: AggregatedApiCall = {
      id: '0x123',
      endpointId: '0x987',
      parameters: { from: 'ETH', to: 'USDC' },
      providers: [0, 1, 2],
      type: 'request',
    };
    const aggregatedCall: AggregatedApiCall = { ...baseAggregatedCall };
    const differentId: AggregatedApiCall = { ...baseAggregatedCall, id: '0xabc' };
    const differentEndpoint: AggregatedApiCall = { ...baseAggregatedCall, endpointId: '0xdef' };
    const differentParameters: AggregatedApiCall = { ...baseAggregatedCall, parameters: { from: 'ETH', to: 'BTC' } };

    expect(model.isDuplicate(apiCall, aggregatedCall)).toEqual(true);
    expect(model.isDuplicate(apiCall, differentId)).toEqual(false);
    expect(model.isDuplicate(apiCall, differentEndpoint)).toEqual(false);
    expect(model.isDuplicate(apiCall, differentParameters)).toEqual(false);
  });
});
