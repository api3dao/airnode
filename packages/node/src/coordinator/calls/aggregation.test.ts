import * as fixtures from 'test/fixtures';
import * as aggregation from './aggregation';
import { RequestStatus } from 'src/types';

describe('aggregate (API calls)', () => {
  it('ignores requests that are not pending', () => {
    const apiCalls = [
      fixtures.requests.buildApiCall({ status: RequestStatus.Errored }),
      fixtures.requests.buildApiCall({ status: RequestStatus.Ignored }),
      fixtures.requests.buildApiCall({ status: RequestStatus.Blocked }),
      fixtures.requests.buildApiCall({ status: RequestStatus.Fulfilled }),
    ];
    const res = aggregation.aggregate(fixtures.buildConfig(), apiCalls);
    expect(res).toEqual({});
  });

  it('groups calls if they have the exact same attributes', () => {
    const endpointId = '0xac2e948e29db14b568a3cbaeedc66c0f9b5c5312f6b562784889e8cbd6a6dd9e';
    const apiCalls = [
      fixtures.requests.buildApiCall({ endpointId }),
      fixtures.requests.buildApiCall({ endpointId }),
      fixtures.requests.buildApiCall({ endpointId }),
    ];
    const res = aggregation.aggregate(fixtures.buildConfig(), apiCalls);
    expect(res).toEqual({
      apiCallId: {
        endpointId: '0xac2e948e29db14b568a3cbaeedc66c0f9b5c5312f6b562784889e8cbd6a6dd9e',
        endpointName: 'convertToUSD',
        id: 'apiCallId',
        oisTitle: 'currency-converter-ois',
        parameters: { from: 'ETH' },
        type: 'request',
      },
    });
  });

  it('groups calls if they have they different attributes unrelated to the API call', () => {
    const endpointId = '0xac2e948e29db14b568a3cbaeedc66c0f9b5c5312f6b562784889e8cbd6a6dd9e';
    const apiCalls = [
      fixtures.requests.buildApiCall({ endpointId, fulfillAddress: '0x123' }),
      fixtures.requests.buildApiCall({ endpointId, fulfillAddress: '0x456' }),
    ];
    const res = aggregation.aggregate(fixtures.buildConfig(), apiCalls);
    expect(res).toEqual({
      apiCallId: {
        endpointId: '0xac2e948e29db14b568a3cbaeedc66c0f9b5c5312f6b562784889e8cbd6a6dd9e',
        endpointName: 'convertToUSD',
        id: 'apiCallId',
        oisTitle: 'currency-converter-ois',
        parameters: { from: 'ETH' },
        type: 'request',
      },
    });
  });
});
