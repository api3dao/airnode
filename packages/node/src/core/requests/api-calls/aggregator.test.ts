jest.mock('../../config', () => ({
  security: {
    masterKeyMnemonic: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
  },
}));

import * as fixtures from 'test/fixtures';
import * as coordinatorState from '../../coordinator/state';
import * as providerState from '../../providers/state';
import * as aggregator from './aggregator';

describe('aggregate', () => {
  describe('API calls', () => {
    it('groups API calls if they have the same attributes', () => {
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

      const res = aggregator.aggregate(state, 'apiCalls');
      expect(res.length).toEqual(1);
      expect(res[0]).toEqual({ ...fixtures.requests.createApiCall(), providers: [0, 1, 2] });
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

      const res = aggregator.aggregate(state, 'apiCalls');
      expect(res.length).toEqual(2);
      expect(res[0]).toEqual({ ...fixtures.requests.createApiCall({ parameters: { to: 'ETH' } }), providers: [0] });
      expect(res[1]).toEqual({ ...fixtures.requests.createApiCall({ parameters: { to: 'USDC' } }), providers: [1] });
    });
  });

  describe('Wallet designations', () => {
    it('groups wallet designations if they have the same attributes', () => {
      const requests = {
        apiCalls: [],
        walletDesignations: [fixtures.requests.createWalletDesignation()],
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
        providers: {
          0: provider0,
          1: provider1,
          2: provider2,
        },
      });

      const res = aggregator.aggregate(state, 'walletDesignations');
      expect(res.length).toEqual(1);
      expect(res[0]).toEqual({ ...fixtures.requests.createWalletDesignation(), providers: [0, 1, 2] });
    });

    it('does not group wallet designations if they have different parameters', () => {
      const requests0 = {
        apiCalls: [],
        walletDesignations: [fixtures.requests.createWalletDesignation({ walletIndex: 5 })],
        withdrawals: [],
      };
      const requests1 = {
        apiCalls: [],
        walletDesignations: [fixtures.requests.createWalletDesignation({ walletIndex: 6 })],
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

      const res = aggregator.aggregate(state, 'walletDesignations');
      expect(res.length).toEqual(2);
      expect(res[0]).toEqual({ ...fixtures.requests.createWalletDesignation({ walletIndex: 5 }), providers: [0] });
      expect(res[1]).toEqual({ ...fixtures.requests.createWalletDesignation({ walletIndex: 6 }), providers: [1] });
    });
  });

  describe('Withdrawals', () => {
    it('groups withdrawals if they have the same attributes', () => {
      const requests = {
        apiCalls: [],
        walletDesignations: [],
        withdrawals: [fixtures.requests.createWithdrawal()],
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
        providers: {
          0: provider0,
          1: provider1,
          2: provider2,
        },
      });

      const res = aggregator.aggregate(state, 'withdrawals');
      expect(res.length).toEqual(1);
      expect(res[0]).toEqual({ ...fixtures.requests.createWithdrawal(), providers: [0, 1, 2] });
    });

    it('does not group withdrawals if they have different parameters', () => {
      const requests0 = {
        apiCalls: [],
        walletDesignations: [],
        withdrawals: [fixtures.requests.createWithdrawal({ destinationAddress: '0x123' })],
      };
      const requests1 = {
        apiCalls: [],
        walletDesignations: [],
        withdrawals: [fixtures.requests.createWithdrawal({ destinationAddress: '0x456' })],
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

      const res = aggregator.aggregate(state, 'withdrawals');
      expect(res.length).toEqual(2);
      expect(res[0]).toEqual({
        ...fixtures.requests.createWithdrawal({ destinationAddress: '0x123' }),
        providers: [0],
      });
      expect(res[1]).toEqual({
        ...fixtures.requests.createWithdrawal({ destinationAddress: '0x456' }),
        providers: [1],
      });
    });
  });
});
