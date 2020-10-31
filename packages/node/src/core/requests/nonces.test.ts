jest.mock('../config', () => ({
  security: {
    masterKeyMnemonic: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
  },
}));

import shuffle from 'lodash/shuffle';
import * as fixtures from 'test/fixtures';
import { EVMProviderState, GroupedRequests, ProviderState, RequestStatus } from 'src/types';
import * as providerState from '../providers/state';
import * as nonces from './nonces';

describe('assign', () => {
  let initialState: ProviderState<EVMProviderState>;

  beforeEach(() => {
    initialState = fixtures.createEVMProviderState();
  });

  it('sorts and assigns nonces requests API calls', () => {
    const first = fixtures.requests.createApiCall({
      id: '0x1',
      nonce: undefined,
      metadata: { blockNumber: 100, transactionHash: '0xa' },
      requesterIndex: '5',
    });
    const second = fixtures.requests.createApiCall({
      id: '0x2',
      nonce: undefined,
      metadata: { blockNumber: 101, transactionHash: '0xb' },
      requesterIndex: '5',
    });
    const third = fixtures.requests.createApiCall({
      id: '0x3',
      nonce: undefined,
      metadata: { blockNumber: 101, transactionHash: '0xc' },
      requesterIndex: '5',
    });
    const requests: GroupedRequests = {
      apiCalls: shuffle([third, second, first]),
      withdrawals: [],
    };
    const transactionCountsByRequesterIndex = { 5: 3 };
    const state = providerState.update(initialState, { requests, transactionCountsByRequesterIndex });
    const res = nonces.assign(state);
    expect(res.apiCalls[0]).toEqual({ ...first, nonce: 3 });
    expect(res.apiCalls[1]).toEqual({ ...second, nonce: 4 });
    expect(res.apiCalls[2]).toEqual({ ...third, nonce: 5 });
  });

  it('sorts and assigns nonces requests withdrawals', () => {
    const first = fixtures.requests.createWithdrawal({
      id: '0x1',
      nonce: undefined,
      metadata: { blockNumber: 100, transactionHash: '0xa' },
      requesterIndex: '7',
    });
    const second = fixtures.requests.createWithdrawal({
      id: '0x2',
      nonce: undefined,
      metadata: { blockNumber: 101, transactionHash: '0xb' },
      requesterIndex: '7',
    });
    const third = fixtures.requests.createWithdrawal({
      id: '0x3',
      nonce: undefined,
      metadata: { blockNumber: 101, transactionHash: '0xc' },
      requesterIndex: '7',
    });
    const requests: GroupedRequests = {
      apiCalls: [],
      withdrawals: shuffle([first, third, second]),
    };
    const transactionCountsByRequesterIndex = { 7: 11 };
    const state = providerState.update(initialState, { requests, transactionCountsByRequesterIndex });
    const res = nonces.assign(state);
    expect(res.withdrawals[0]).toEqual({ ...first, nonce: 11 });
    expect(res.withdrawals[1]).toEqual({ ...second, nonce: 12 });
    expect(res.withdrawals[2]).toEqual({ ...third, nonce: 13 });
  });

  it('does not share nonces between requesters', () => {
    const requests: GroupedRequests = {
      apiCalls: [
        fixtures.requests.createApiCall({ id: '0x1', requesterIndex: '7', nonce: undefined }),
        fixtures.requests.createApiCall({ id: '0x2', requesterIndex: '8', nonce: undefined }),
        fixtures.requests.createApiCall({ id: '0x3', requesterIndex: '9', nonce: undefined }),
      ],
      withdrawals: [],
    };
    const transactionCountsByRequesterIndex = { 7: 11, 8: 11, 9: 7 };
    const state = providerState.update(initialState, { requests, transactionCountsByRequesterIndex });
    const res = nonces.assign(state);
    expect(res[0].apiCalls[0].nonce).toEqual(11);
    expect(res[3].apiCalls[0].nonce).toEqual(11);
    expect(res[7].apiCalls[0].nonce).toEqual(7);
  });

  it('blocks nonce assignment if a request is blocked', () => {
    const first = fixtures.requests.createApiCall({
      id: '0x1',
      nonce: undefined,
      metadata: { blockNumber: 100, transactionHash: '0xa' },
      requesterIndex: '3',
    });
    const second = fixtures.requests.createApiCall({
      id: '0x2',
      status: RequestStatus.Blocked,
      nonce: undefined,
      metadata: { blockNumber: 101, transactionHash: '0xb' },
      requesterIndex: '3',
    });
    const third = fixtures.requests.createApiCall({
      id: '0x3',
      nonce: undefined,
      metadata: { blockNumber: 101, transactionHash: '0xc' },
      requesterIndex: '3',
    });
    const requests: GroupedRequests = {
      apiCalls: shuffle([third, second, first]),
      withdrawals: [],
    };
    const transactionCountsByRequesterIndex = { 3: 3 };
    const state = providerState.update(initialState, {
      currentBlock: 102,
      requests,
      transactionCountsByRequesterIndex,
    });
    const res = nonces.assign(state);
    expect(res.apiCalls[0]).toEqual({ ...first, nonce: 3 });
    expect(res.apiCalls[1]).toEqual({ ...second, nonce: undefined });
    expect(res.apiCalls[2]).toEqual({ ...third, nonce: undefined });
  });

  it('skips blocked requests if more than 20 blocks have passed', () => {
    const first = fixtures.requests.createApiCall({
      id: '0x1',
      nonce: undefined,
      metadata: { blockNumber: 100, transactionHash: '0xa' },
      requesterIndex: '3',
    });
    const second = fixtures.requests.createApiCall({
      id: '0x2',
      status: RequestStatus.Blocked,
      nonce: undefined,
      metadata: { blockNumber: 101, transactionHash: '0xb' },
      requesterIndex: '3',
    });
    const third = fixtures.requests.createApiCall({
      id: '0x3',
      nonce: undefined,
      metadata: { blockNumber: 101, transactionHash: '0xc' },
      requesterIndex: '3',
    });
    const requests: GroupedRequests = {
      apiCalls: shuffle([third, second, first]),
      withdrawals: [],
    };
    const transactionCountsByRequesterIndex = { 3: 3 };
    const state = providerState.update(initialState, {
      currentBlock: 122,
      requests,
      transactionCountsByRequesterIndex,
    });
    const res = nonces.assign(state);
    expect(res.apiCalls[0]).toEqual({ ...first, nonce: 3 });
    expect(res.apiCalls[1]).toEqual({ ...second, nonce: undefined });
    expect(res.apiCalls[2]).toEqual({ ...third, nonce: 4 });
  });
});
