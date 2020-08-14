jest.mock('../../config', () => ({
  security: {
    masterKeyMnemonic: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
  },
}));

import * as fixtures from 'test/fixtures';
import * as coordinatorState from '../../coordinator/state';
import * as providerState from '../../providers/state';
import * as aggregator from './aggregator';

describe('API call aggregator', () => {
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
    state = coordinatorState.update(state, {
      providers: { 0: provider0, 1: provider1, 2: provider2 },
    });

    const res = aggregator.aggregate(state);
    expect(res.length).toEqual(1);
    expect(res[0]).toEqual({
      endpointId: 'endpointId',
      id: 'apiCallId',
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
    state = coordinatorState.update(state, {
      providers: { 0: provider0, 1: provider1 },
    });

    const res = aggregator.aggregate(state);
    expect(res.length).toEqual(1);
    expect(res[0]).toEqual({
      endpointId: 'endpointId',
      id: 'apiCallId',
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
    state = coordinatorState.update(state, {
      providers: { 0: provider0, 1: provider1 },
    });

    const res = aggregator.aggregate(state);
    expect(res.length).toEqual(2);
    expect(res[0]).toEqual({
      endpointId: 'endpointId',
      id: 'apiCallId',
      parameters: { to: 'ETH' },
      providers: [0],
      type: 'request',
    });
    expect(res[1]).toEqual({
      endpointId: 'endpointId',
      id: 'apiCallId',
      parameters: { to: 'USDC' },
      providers: [1],
      type: 'request',
    });
  });
});
