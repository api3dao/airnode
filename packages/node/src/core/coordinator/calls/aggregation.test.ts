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
    const metadata = { blockNumber: 100, transactionHash: '0xa' };
    const apiCalls = [
      fixtures.requests.createApiCall({ metadata: { ...metadata, providerIndex: 0 } }),
      fixtures.requests.createApiCall({ metadata: { ...metadata, providerIndex: 1 } }),
      fixtures.requests.createApiCall({ metadata: { ...metadata, providerIndex: 2 } }),
    ];
    const res = aggregation.aggregate(apiCalls);
    expect(res.length).toEqual(1);
    expect(res[0]).toEqual({
      endpointId: 'endpointId',
      endpointName: 'endpointName',
      id: 'apiCallId',
      oisTitle: 'oisTitle',
      parameters: { from: 'ETH' },
      providers: [0, 1, 2],
      type: 'request',
    });
  });

  it('groups calls if they have they different attributes unrelated to the API call', () => {
    const metadata = { blockNumber: 100, transactionHash: '0xa' };
    const apiCalls = [
      fixtures.requests.createApiCall({ fulfillAddress: '0x123', metadata: { ...metadata, providerIndex: 0 } }),
      fixtures.requests.createApiCall({ fulfillAddress: '0x456', metadata: { ...metadata, providerIndex: 1 } }),
    ];
    const res = aggregation.aggregate(apiCalls);
    expect(res.length).toEqual(1);
    expect(res[0]).toEqual({
      endpointId: 'endpointId',
      endpointName: 'endpointName',
      id: 'apiCallId',
      oisTitle: 'oisTitle',
      parameters: { from: 'ETH' },
      providers: [0, 1],
      type: 'request',
    });
  });

  it('does not group API calls if they have different parameters', () => {
    const metadata = { blockNumber: 100, transactionHash: '0xa' };
    const apiCalls = [
      fixtures.requests.createApiCall({ parameters: { to: 'ETH' }, metadata: { ...metadata, providerIndex: 0 } }),
      fixtures.requests.createApiCall({ parameters: { to: 'USDC' }, metadata: { ...metadata, providerIndex: 1 } }),
    ];
    const res = aggregation.aggregate(apiCalls);
    expect(res.length).toEqual(2);
    expect(res[0]).toEqual({
      endpointId: 'endpointId',
      endpointName: 'endpointName',
      id: 'apiCallId',
      oisTitle: 'oisTitle',
      parameters: { to: 'ETH' },
      providers: [0],
      type: 'request',
    });
    expect(res[1]).toEqual({
      endpointId: 'endpointId',
      endpointName: 'endpointName',
      id: 'apiCallId',
      oisTitle: 'oisTitle',
      parameters: { to: 'USDC' },
      providers: [1],
      type: 'request',
    });
  });
});
