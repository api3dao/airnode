import * as fixtures from 'test/fixtures';
import * as apiCalls from './api-calls';
import { AggregatedApiCall, WalletDataByIndex } from 'src/types';

describe('isDuplicate (API calls)', () => {
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
      type: 'request',
    };
    const aggregatedCall: AggregatedApiCall = { ...baseAggregatedCall };
    const differentId: AggregatedApiCall = { ...baseAggregatedCall, id: '0xabc' };
    const differentEndpoint: AggregatedApiCall = { ...baseAggregatedCall, endpointId: '0xdef' };
    const differentParameters: AggregatedApiCall = { ...baseAggregatedCall, parameters: { from: 'ETH', to: 'BTC' } };

    expect(apiCalls.isDuplicate(apiCall, aggregatedCall)).toEqual(true);
    expect(apiCalls.isDuplicate(apiCall, differentId)).toEqual(false);
    expect(apiCalls.isDuplicate(apiCall, differentEndpoint)).toEqual(false);
    expect(apiCalls.isDuplicate(apiCall, differentParameters)).toEqual(false);
  });
});

describe('flatten (API calls)', () => {
  it('flattens the requests across all wallets', () => {
    const call1 = fixtures.requests.createApiCall({ id: '0x1' });
    const call2 = fixtures.requests.createApiCall({ id: '0x2' });
    const walletDataByIndex: WalletDataByIndex = {
      3: {
        address: '0xaddress1',
        requests: {
          apiCalls: [call1],
          withdrawals: [],
        },
        transactionCount: 5,
      },
      4: {
        address: '0xaddress2',
        requests: {
          apiCalls: [call2],
          withdrawals: [],
        },
        transactionCount: 5,
      },
    };
    const res = apiCalls.flatten(walletDataByIndex);
    expect(res).toEqual([call1, call2]);
  });
});
