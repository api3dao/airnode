jest.mock('../../config', () => ({
  security: {
    masterKeyMnemonic: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
  },
}));

import * as fixtures from 'test/fixtures';
import { GroupedRequests, ProviderState, RequestErrorCode } from '../../../types';
import * as providerState from '../../providers/state';
import * as discarder from './discarder';

describe('discardUnprocessableRequests', () => {
  let state: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    state = providerState.create(config, 0);
  });

  it('does nothing if the request is valid', () => {
    const requests: GroupedRequests = {
      apiCalls: [fixtures.requests.createApiCall()],
      walletDesignations: [],
      withdrawals: [],
    };

    const { apiCalls } = discarder.discardUnprocessableRequests(state, requests);
    expect(apiCalls.length).toEqual(1);
    expect(apiCalls[0].id).toEqual('apiCallId');
  });

  it('does nothing for unknown error codes', () => {
    const requests: GroupedRequests = {
      apiCalls: [fixtures.requests.createApiCall({ valid: false, errorCode: 9999 })],
      walletDesignations: [],
      withdrawals: [],
    };

    const { apiCalls } = discarder.discardUnprocessableRequests(state, requests);
    expect(apiCalls.length).toEqual(1);
    expect(apiCalls[0].id).toEqual('apiCallId');
  });

  it('discards requests where the requester could not be found', () => {
    const requests: GroupedRequests = {
      apiCalls: [fixtures.requests.createApiCall({ valid: false, errorCode: RequestErrorCode.RequesterDataNotFound })],
      walletDesignations: [],
      withdrawals: [],
    };

    const { apiCalls } = discarder.discardUnprocessableRequests(state, requests);
    expect(apiCalls.length).toEqual(0);
  });

  it('discards requests where the requester has an insufficient wallet balance', () => {
    const requests: GroupedRequests = {
      apiCalls: [fixtures.requests.createApiCall({ valid: false, errorCode: RequestErrorCode.InsufficientBalance })],
      walletDesignations: [],
      withdrawals: [],
    };

    const { apiCalls } = discarder.discardUnprocessableRequests(state, requests);
    expect(apiCalls.length).toEqual(0);
  });
});

describe('discardRequestsWithWithdrawals', () => {
  let state: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    state = providerState.create(config, 0);
  });

  it('discards pending API calls with pending withdrawals from the same wallet index', () => {
    const requests: GroupedRequests = {
      apiCalls: [fixtures.requests.createApiCall({ walletIndex: '123' })],
      walletDesignations: [],
      withdrawals: [fixtures.requests.createWithdrawal({ walletIndex: '123' })],
    };

    const res = discarder.discardRequestsWithWithdrawals(state, requests);
    expect(res.apiCalls.length).toEqual(0);
    expect(res.withdrawals.length).toEqual(1);
    expect(res.withdrawals[0].id).toEqual('withdrawalId');
  });

  it('does nothing if API call and withdrawal wallet indices do not match', () => {
    const requests: GroupedRequests = {
      apiCalls: [fixtures.requests.createApiCall({ walletIndex: '123' })],
      walletDesignations: [],
      withdrawals: [fixtures.requests.createWithdrawal({ walletIndex: '456' })],
    };

    const res = discarder.discardRequestsWithWithdrawals(state, requests);
    expect(res.apiCalls.length).toEqual(1);
    expect(res.apiCalls[0].id).toEqual('apiCallId');
    expect(res.withdrawals.length).toEqual(1);
    expect(res.withdrawals[0].id).toEqual('withdrawalId');
  });
});
