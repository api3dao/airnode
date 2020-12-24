import * as fixtures from 'test/fixtures';
import * as aggregation from './aggregation';
import { RequestStatus } from 'src/types';

describe('aggregate (API calls)', () => {
  it('ignores requests that are not pending', () => {
    const apiCalls = [
      fixtures.requests.createApiCall({ status: RequestStatus.Errored }),
      fixtures.requests.createApiCall({ status: RequestStatus.Ignored }),
      fixtures.requests.createApiCall({ status: RequestStatus.Blocked }),
      fixtures.requests.createApiCall({ status: RequestStatus.Fulfilled }),
    ];
    const res = aggregation.aggregate(fixtures.buildConfig(), apiCalls);
    expect(res).toEqual({});
  });

  it('groups calls if they have the exact same attributes', () => {
    const endpointId = '0x8b4b3591c5b12c65a837459ada36116f755c9a156df205eba211c5789fc48da6';
    const apiCalls = [
      fixtures.requests.createApiCall({ endpointId }),
      fixtures.requests.createApiCall({ endpointId }),
      fixtures.requests.createApiCall({ endpointId }),
    ];
    const res = aggregation.aggregate(fixtures.buildConfig(), apiCalls);
    expect(res).toEqual({
      apiCallId: {
        endpointId: '0x8b4b3591c5b12c65a837459ada36116f755c9a156df205eba211c5789fc48da6',
        endpointName: 'convertToUSD',
        id: 'apiCallId',
        oisTitle: 'test-ois',
        parameters: { from: 'ETH' },
        type: 'request',
      },
    });
  });

  it('groups calls if they have they different attributes unrelated to the API call', () => {
    const endpointId = '0x8b4b3591c5b12c65a837459ada36116f755c9a156df205eba211c5789fc48da6';
    const apiCalls = [
      fixtures.requests.createApiCall({ endpointId, fulfillAddress: '0x123' }),
      fixtures.requests.createApiCall({ endpointId, fulfillAddress: '0x456' }),
    ];
    const res = aggregation.aggregate(fixtures.buildConfig(), apiCalls);
    expect(res).toEqual({
      apiCallId: {
        endpointId: '0x8b4b3591c5b12c65a837459ada36116f755c9a156df205eba211c5789fc48da6',
        endpointName: 'convertToUSD',
        id: 'apiCallId',
        oisTitle: 'test-ois',
        parameters: { from: 'ETH' },
        type: 'request',
      },
    });
  });
});
