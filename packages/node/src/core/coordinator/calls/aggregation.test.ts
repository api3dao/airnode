jest.mock('../../config', () => ({
  config: {
    triggers: {
      requests: [{ endpointId: 'endpointId', endpointName: 'endpointName', oisTitle: 'oisTitle' }],
    },
  },
}));

import * as fixtures from 'test/fixtures';
import * as aggregation from './aggregation';

describe('aggregate (API calls)', () => {
  it('groups calls if they have the exact same attributes', () => {
    const apiCalls = [
      fixtures.requests.createApiCall(),
      fixtures.requests.createApiCall(),
      fixtures.requests.createApiCall(),
    ];
    const res = aggregation.aggregate(apiCalls);
    expect(res).toEqual({
      apiCallId: [
        {
          endpointId: 'endpointId',
          endpointName: 'endpointName',
          id: 'apiCallId',
          oisTitle: 'oisTitle',
          parameters: { from: 'ETH' },
          type: 'request',
        },
      ],
    });
  });

  it('groups calls if they have they different attributes unrelated to the API call', () => {
    const apiCalls = [
      fixtures.requests.createApiCall({ fulfillAddress: '0x123' }),
      fixtures.requests.createApiCall({ fulfillAddress: '0x456' }),
    ];
    const res = aggregation.aggregate(apiCalls);
    expect(res).toEqual({
      apiCallId: [
        {
          endpointId: 'endpointId',
          endpointName: 'endpointName',
          id: 'apiCallId',
          oisTitle: 'oisTitle',
          parameters: { from: 'ETH' },
          type: 'request',
        },
      ],
    });
  });

  it('does not group API calls if they have different parameters', () => {
    const apiCalls = [
      fixtures.requests.createApiCall({ parameters: { to: 'ETH' } }),
      fixtures.requests.createApiCall({ parameters: { to: 'USDC' } }),
    ];
    const res = aggregation.aggregate(apiCalls);
    expect(res).toEqual({
      apiCallId: [
        {
          endpointId: 'endpointId',
          endpointName: 'endpointName',
          id: 'apiCallId',
          oisTitle: 'oisTitle',
          parameters: { to: 'ETH' },
          type: 'request',
        },
        {
          endpointId: 'endpointId',
          endpointName: 'endpointName',
          id: 'apiCallId',
          oisTitle: 'oisTitle',
          parameters: { to: 'USDC' },
          type: 'request',
        },
      ],
    });
  });
});
