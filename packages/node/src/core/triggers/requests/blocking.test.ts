jest.mock('../../config', () => ({
  security: {
    masterKeyMnemonic: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
  },
}));

import * as fixtures from 'test/fixtures';
import { GroupedRequests, ProviderState, RequestStatus } from '../../../types';
import * as providerState from '../../providers/state';
import * as blocking from './blocking';

describe('blockRequestsWithWithdrawals', () => {
  let state: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    state = providerState.create(config, 0);
  });

  it('blocks API calls with pending withdrawals from the same wallet index', () => {
    const requests: GroupedRequests = {
      apiCalls: [fixtures.requests.createApiCall({ walletIndex: '123' })],
      walletDesignations: [],
      withdrawals: [fixtures.requests.createWithdrawal({ walletIndex: '123' })],
    };

    const res = blocking.blockRequestsWithWithdrawals(state, requests);
    expect(res.apiCalls.length).toEqual(0);
    expect(res.withdrawals.length).toEqual(1);
    expect(res.withdrawals[0].id).toEqual('withdrawalId');
    expect(res.withdrawals[0].status).toEqual(RequestStatus.Blocked);
  });

  it('does nothing if API call and withdrawal wallet indices do not match', () => {
    const requests: GroupedRequests = {
      apiCalls: [fixtures.requests.createApiCall({ walletIndex: '123' })],
      walletDesignations: [],
      withdrawals: [fixtures.requests.createWithdrawal({ walletIndex: '456' })],
    };

    const res = blocking.blockRequestsWithWithdrawals(state, requests);
    expect(res.apiCalls.length).toEqual(1);
    expect(res.apiCalls[0].id).toEqual('apiCallId');
    expect(res.apiCalls[0].status).toEqual(RequestStatus.Pending);

    expect(res.withdrawals.length).toEqual(1);
    expect(res.withdrawals[0].id).toEqual('withdrawalId');
    expect(res.withdrawals[0].status).toEqual(RequestStatus.Pending);
  });
});
