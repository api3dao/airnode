jest.mock('../../config', () => ({
  config: {
    triggers: {
      requests: [{ endpointId: 'endpointId', endpointName: 'endpointName', oisTitle: 'oisTitle' }],
    },
  },
  security: {
    masterKeyMnemonic: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
  },
}));

import * as fixtures from 'test/fixtures';
import { RequestErrorCode } from 'src/types';
import * as coordinatorState from '../../coordinator/state';
import * as providerState from '../../providers/state';
import * as aggregator from './aggregator';

describe('aggregate ClientRequests', () => {
  it('groups calls if they have the exact same attributes', () => {
    const requests = {
      apiCalls: [fixtures.requests.createApiCall()],
      walletDesignations: [],
      withdrawals: [],
    };

    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    let provider0 = providerState.create(config, 0);
    let provider1 = providerState.create(config, 1);
    let provider2 = providerState.create(config, 2);

    provider0 = providerState.update(provider0, { requests });
    provider1 = providerState.update(provider1, { requests });
    provider2 = providerState.update(provider2, { requests });

    let state = coordinatorState.create();
    state = coordinatorState.update(state, { providers: [provider0, provider1, provider2] });

    const res = aggregator.aggregate(state);
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
    const requests0 = {
      apiCalls: [fixtures.requests.createApiCall({ fulfillAddress: '0x123' })],
      walletDesignations: [],
      withdrawals: [],
    };
    const requests1 = {
      apiCalls: [fixtures.requests.createApiCall({ fulfillAddress: '0x456' })],
      walletDesignations: [],
      withdrawals: [],
    };

    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    let provider0 = providerState.create(config, 0);
    let provider1 = providerState.create(config, 1);

    provider0 = providerState.update(provider0, { requests: requests0 });
    provider1 = providerState.update(provider1, { requests: requests1 });

    let state = coordinatorState.create();
    state = coordinatorState.update(state, { providers: [provider0, provider1] });

    const res = aggregator.aggregate(state);
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
    const requests0 = {
      apiCalls: [fixtures.requests.createApiCall({ parameters: { to: 'ETH' } })],
      walletDesignations: [],
      withdrawals: [],
    };
    const requests1 = {
      apiCalls: [fixtures.requests.createApiCall({ parameters: { to: 'USDC' } })],
      walletDesignations: [],
      withdrawals: [],
    };

    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    let provider0 = providerState.create(config, 0);
    let provider1 = providerState.create(config, 1);

    provider0 = providerState.update(provider0, { requests: requests0 });
    provider1 = providerState.update(provider1, { requests: requests1 });

    let state = coordinatorState.create();
    state = coordinatorState.update(state, { providers: [provider0, provider1] });

    const res = aggregator.aggregate(state);
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

describe('disaggregate - ClientRequests', () => {
  it('maps aggregated responses back to requests for each provider', () => {
    const requests0 = {
      apiCalls: [fixtures.requests.createApiCall()],
      walletDesignations: [],
      withdrawals: [],
    };
    const requests1 = {
      apiCalls: [fixtures.requests.createApiCall()],
      walletDesignations: [],
      withdrawals: [],
    };
    const requests2 = {
      apiCalls: [fixtures.requests.createApiCall()],
      walletDesignations: [],
      withdrawals: [],
    };

    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    let provider0 = providerState.create(config, 0);
    let provider1 = providerState.create(config, 1);
    let provider2 = providerState.create(config, 2);

    provider0 = providerState.update(provider0, { requests: requests0 });
    provider1 = providerState.update(provider1, { requests: requests1 });
    provider2 = providerState.update(provider2, { requests: requests2 });

    const aggregatedApiCalls = [fixtures.createAggregatedApiCall({ providers: [0, 1], response: { value: '0x123' } })];

    let state = coordinatorState.create();
    state = coordinatorState.update(state, { aggregatedApiCalls, providers: [provider0, provider1, provider2] });

    const res = aggregator.disaggregate(state);
    expect(res[0].requests.apiCalls[0].response).toEqual({ value: '0x123' });
    expect(res[1].requests.apiCalls[0].response).toEqual({ value: '0x123' });
    expect(res[2].requests.apiCalls[0].response).toEqual(undefined);
  });

  it('updates each request based on the provider(s) it was linked to', () => {
    // The 2 calls are exactly the same, but are linked to different providers
    const requests0 = {
      apiCalls: [fixtures.requests.createApiCall()],
      walletDesignations: [],
      withdrawals: [],
    };
    const requests1 = {
      apiCalls: [fixtures.requests.createApiCall()],
      walletDesignations: [],
      withdrawals: [],
    };

    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    let provider0 = providerState.create(config, 0);
    let provider1 = providerState.create(config, 1);

    provider0 = providerState.update(provider0, { requests: requests0 });
    provider1 = providerState.update(provider1, { requests: requests1 });

    const aggregatedApiCalls = [
      fixtures.createAggregatedApiCall({ providers: [0], response: { value: '0x123' } }),
      fixtures.createAggregatedApiCall({ providers: [1], error: { errorCode: RequestErrorCode.ApiCallFailed } }),
    ];

    let state = coordinatorState.create();
    state = coordinatorState.update(state, { aggregatedApiCalls, providers: [provider0, provider1] });

    const res = aggregator.disaggregate(state);
    expect(res[0].requests.apiCalls[0].response).toEqual({ value: '0x123' });
    expect(res[0].requests.apiCalls[0].error).toEqual(undefined);
    expect(res[1].requests.apiCalls[0].response).toEqual(undefined);
    expect(res[1].requests.apiCalls[0].error).toEqual({ errorCode: RequestErrorCode.ApiCallFailed });
  });

  it('does not update the request if the parameters are different', () => {
    const requests0 = {
      apiCalls: [fixtures.requests.createApiCall({ parameters: { from: 'ETH' } })],
      walletDesignations: [],
      withdrawals: [],
    };
    const requests1 = {
      apiCalls: [fixtures.requests.createApiCall({ parameters: { from: 'BTC' } })],
      walletDesignations: [],
      withdrawals: [],
    };

    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    let provider0 = providerState.create(config, 0);
    let provider1 = providerState.create(config, 1);

    provider0 = providerState.update(provider0, { requests: requests0 });
    provider1 = providerState.update(provider1, { requests: requests1 });

    const aggregatedApiCalls = [
      fixtures.createAggregatedApiCall({
        parameters: { from: 'BTC' },
        providers: [0, 1],
        response: { value: '0x123' },
      }),
    ];

    let state = coordinatorState.create();
    state = coordinatorState.update(state, { aggregatedApiCalls, providers: [provider0, provider1] });

    const res = aggregator.disaggregate(state);
    expect(res[0].requests.apiCalls[0].response).toEqual(undefined);
    expect(res[0].requests.apiCalls[0].error).toEqual(undefined);
    expect(res[1].requests.apiCalls[0].response).toEqual({ value: '0x123' });
    expect(res[1].requests.apiCalls[0].error).toEqual(undefined);
  });

  it('does not update the request if the endpoint IDs are different', () => {
    const requests0 = {
      apiCalls: [fixtures.requests.createApiCall({ endpointId: '0xunknown' })],
      walletDesignations: [],
      withdrawals: [],
    };
    const requests1 = {
      apiCalls: [fixtures.requests.createApiCall({ endpointId: '0xendpointId' })],
      walletDesignations: [],
      withdrawals: [],
    };

    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    let provider0 = providerState.create(config, 0);
    let provider1 = providerState.create(config, 1);

    provider0 = providerState.update(provider0, { requests: requests0 });
    provider1 = providerState.update(provider1, { requests: requests1 });

    const aggregatedApiCalls = [
      fixtures.createAggregatedApiCall({
        endpointId: '0xendpointId',
        providers: [0, 1],
        response: { value: '0x123' },
      }),
    ];

    let state = coordinatorState.create();
    state = coordinatorState.update(state, { aggregatedApiCalls, providers: [provider0, provider1] });

    const res = aggregator.disaggregate(state);
    expect(res[0].requests.apiCalls[0].response).toEqual(undefined);
    expect(res[0].requests.apiCalls[0].error).toEqual(undefined);
    expect(res[1].requests.apiCalls[0].response).toEqual({ value: '0x123' });
    expect(res[1].requests.apiCalls[0].error).toEqual(undefined);
  });

  it('does not update the request if the request IDs are different', () => {
    const requests0 = {
      apiCalls: [fixtures.requests.createApiCall({ id: '0xunknown' })],
      walletDesignations: [],
      withdrawals: [],
    };
    const requests1 = {
      apiCalls: [fixtures.requests.createApiCall({ id: '0xid' })],
      walletDesignations: [],
      withdrawals: [],
    };

    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    let provider0 = providerState.create(config, 0);
    let provider1 = providerState.create(config, 1);

    provider0 = providerState.update(provider0, { requests: requests0 });
    provider1 = providerState.update(provider1, { requests: requests1 });

    const aggregatedApiCalls = [
      fixtures.createAggregatedApiCall({
        id: '0xid',
        providers: [0, 1],
        error: { errorCode: RequestErrorCode.ApiCallFailed, message: 'Failed to call API' },
      }),
    ];

    let state = coordinatorState.create();
    state = coordinatorState.update(state, { aggregatedApiCalls, providers: [provider0, provider1] });

    const res = aggregator.disaggregate(state);
    expect(res[0].requests.apiCalls[0].response).toEqual(undefined);
    expect(res[0].requests.apiCalls[0].error).toEqual(undefined);
    expect(res[1].requests.apiCalls[0].response).toEqual(undefined);
    expect(res[1].requests.apiCalls[0].error).toEqual({
      errorCode: RequestErrorCode.ApiCallFailed,
      message: 'Failed to call API',
    });
  });
});
