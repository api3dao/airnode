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
    const apiCalls = [
      fixtures.requests.createApiCall(),
      fixtures.requests.createApiCall(),
      fixtures.requests.createApiCall(),
    ];
    const res = aggregation.aggregate(fixtures.buildConfig(), apiCalls);
    expect(res).toEqual({
      apiCallId: {
        endpointId: 'endpointId',
        endpointName: 'endpointName',
        id: 'apiCallId',
        oisTitle: 'oisTitle',
        parameters: { from: 'ETH' },
        type: 'request',
      },
    });
  });

  it('groups calls if they have they different attributes unrelated to the API call', () => {
    const apiCalls = [
      fixtures.requests.createApiCall({ fulfillAddress: '0x123' }),
      fixtures.requests.createApiCall({ fulfillAddress: '0x456' }),
    ];
    const res = aggregation.aggregate(fixtures.buildConfig(), apiCalls);
    expect(res).toEqual({
      apiCallId: {
        endpointId: 'endpointId',
        endpointName: 'endpointName',
        id: 'apiCallId',
        oisTitle: 'oisTitle',
        parameters: { from: 'ETH' },
        type: 'request',
      },
    });
  });
});
