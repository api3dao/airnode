jest.mock('../config', () => ({
  config: {
    triggers: {
      requests: [{ endpointId: 'endpointId', endpointName: 'endpointName', oisTitle: 'oisTitle' }],
    },
  },
}));

import * as fixtures from 'test/fixtures';
import * as coordinatorState from '../coordinator/state';
import * as providerState from '../providers/state';
import * as aggregation from './api-call-aggregation';

describe('API call aggregation', () => {
  it('groups API calls from requests', () => {
    const walletData = {
      address: '0x1',
      requests: {
        apiCalls: [fixtures.requests.createApiCall()],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 5,
    };

    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    let provider0 = providerState.create(config, 0);
    let provider1 = providerState.create(config, 1);
    let provider2 = providerState.create(config, 2);

    provider0 = providerState.update(provider0, { walletDataByIndex: { 1: walletData } });
    provider1 = providerState.update(provider1, { walletDataByIndex: { 1: walletData } });
    provider2 = providerState.update(provider2, { walletDataByIndex: { 1: walletData } });

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
});

describe('API call disaggregation', () => {
  it('maps aggregated responses back to requests for each provider', () => {
    const walletData0 = {
      address: '0x1',
      requests: {
        apiCalls: [fixtures.requests.createApiCall()],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 2,
    };
    const walletData1 = {
      address: '0x2',
      requests: {
        apiCalls: [fixtures.requests.createApiCall()],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 5,
    };
    const walletData2 = {
      address: '0x3',
      requests: {
        apiCalls: [fixtures.requests.createApiCall()],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 8,
    };

    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    let provider0 = providerState.create(config, 0);
    let provider1 = providerState.create(config, 1);
    let provider2 = providerState.create(config, 2);

    provider0 = providerState.update(provider0, { walletDataByIndex: { 1: walletData0 } });
    provider1 = providerState.update(provider1, { walletDataByIndex: { 1: walletData1 } });
    provider2 = providerState.update(provider2, { walletDataByIndex: { 1: walletData2 } });

    const aggregatedApiCalls = [fixtures.createAggregatedApiCall({ providers: [0, 1], response: { value: '0x123' } })];

    let state = coordinatorState.create();
    state = coordinatorState.update(state, { aggregatedApiCalls, providers: [provider0, provider1, provider2] });

    const res = aggregation.disaggregate(state);
    expect(res[0].walletDataByIndex[1].requests.apiCalls[0].response).toEqual({ value: '0x123' });
    expect(res[1].walletDataByIndex[1].requests.apiCalls[0].response).toEqual({ value: '0x123' });
    expect(res[2].walletDataByIndex[1].requests.apiCalls[0].response).toEqual(undefined);
  });
});
