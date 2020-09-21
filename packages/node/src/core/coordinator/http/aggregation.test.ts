jest.mock('../../config', () => ({
  config: {
    triggers: {
      requests: [{ endpointId: 'endpointId', endpointName: 'endpointName', oisTitle: 'oisTitle' }],
    },
  },
}));

import * as fixtures from 'test/fixtures';
import * as coordinatorState from '../../coordinator/state';
import * as providerState from '../../providers/state';
import * as aggregation from './aggregation';

describe('aggregate ClientRequests', () => {
  it('groups calls if they have the exact same attributes', () => {
    const metadata = { blockNumber: 100, transactionHash: '0xa' };
    const walletData1 = {
      address: '0x1',
      requests: {
        apiCalls: [fixtures.requests.createApiCall({ metadata: { ...metadata, providerIndex: 0 } })],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 5,
    };
    const walletData2 = {
      address: '0x2',
      requests: {
        apiCalls: [fixtures.requests.createApiCall({ metadata: { ...metadata, providerIndex: 1 } })],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 5,
    };
    const walletData3 = {
      address: '0x3',
      requests: {
        apiCalls: [fixtures.requests.createApiCall({ metadata: { ...metadata, providerIndex: 2 } })],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 5,
    };

    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    let provider0 = providerState.create(config, 0);
    let provider1 = providerState.create(config, 1);
    let provider2 = providerState.create(config, 2);

    provider0 = providerState.update(provider0, { walletDataByIndex: { 1: walletData1 } });
    provider1 = providerState.update(provider1, { walletDataByIndex: { 1: walletData2 } });
    provider2 = providerState.update(provider2, { walletDataByIndex: { 1: walletData3 } });

    let state = coordinatorState.create();
    state = coordinatorState.update(state, { providers: [provider0, provider1, provider2] });

    const res = aggregation.aggregate(state);
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
    const walletData0 = {
      address: '0x1',
      requests: {
        apiCalls: [
          fixtures.requests.createApiCall({ fulfillAddress: '0x123', metadata: { ...metadata, providerIndex: 0 } }),
        ],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 5,
    };
    const walletData1 = {
      address: '0x2',
      requests: {
        apiCalls: [
          fixtures.requests.createApiCall({ fulfillAddress: '0x456', metadata: { ...metadata, providerIndex: 1 } }),
        ],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 5,
    };

    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    let provider0 = providerState.create(config, 0);
    let provider1 = providerState.create(config, 1);

    provider0 = providerState.update(provider0, { walletDataByIndex: { 1: walletData0 } });
    provider1 = providerState.update(provider1, { walletDataByIndex: { 1: walletData1 } });

    let state = coordinatorState.create();
    state = coordinatorState.update(state, { providers: [provider0, provider1] });

    const res = aggregation.aggregate(state);
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
    const walletData0 = {
      address: '0x1',
      requests: {
        apiCalls: [
          fixtures.requests.createApiCall({ parameters: { to: 'ETH' }, metadata: { ...metadata, providerIndex: 0 } }),
        ],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 5,
    };
    const walletData1 = {
      address: '0x2',
      requests: {
        apiCalls: [
          fixtures.requests.createApiCall({ parameters: { to: 'USDC' }, metadata: { ...metadata, providerIndex: 1 } }),
        ],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 5,
    };

    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    let provider0 = providerState.create(config, 0);
    let provider1 = providerState.create(config, 1);

    provider0 = providerState.update(provider0, { walletDataByIndex: { 1: walletData0 } });
    provider1 = providerState.update(provider1, { walletDataByIndex: { 1: walletData1 } });

    let state = coordinatorState.create();
    state = coordinatorState.update(state, { providers: [provider0, provider1] });

    const res = aggregation.aggregate(state);
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
