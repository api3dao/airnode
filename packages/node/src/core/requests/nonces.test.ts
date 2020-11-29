import shuffle from 'lodash/shuffle';
import * as fixtures from 'test/fixtures';
import { EVMProviderState, GroupedRequests, ProviderState, RequestStatus } from 'src/types';
import * as providerState from '../providers/state';
import * as nonces from './nonces';

describe('assign', () => {
  let initialState: ProviderState<EVMProviderState>;

  beforeEach(() => {
    initialState = fixtures.buildEVMProviderState();
  });

  it('sorts and assigns nonces requests API calls', () => {
    const firstMeta = fixtures.requests.buildMetadata({ blockNumber: 100, transactionHash: '0xa' });
    const secondMeta = fixtures.requests.buildMetadata({ blockNumber: 101, transactionHash: '0xb' });
    const thirdMeta = fixtures.requests.buildMetadata({ blockNumber: 101, transactionHash: '0xc' });

    const first = fixtures.requests.createApiCall({
      id: '0x1',
      nonce: undefined,
      metadata: firstMeta,
      requesterIndex: '5',
    });
    const second = fixtures.requests.createApiCall({
      id: '0x2',
      nonce: undefined,
      metadata: secondMeta,
      requesterIndex: '5',
    });
    const third = fixtures.requests.createApiCall({
      id: '0x3',
      nonce: undefined,
      metadata: thirdMeta,
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
    const firstMeta = fixtures.requests.buildMetadata({ blockNumber: 100, transactionHash: '0xa' });
    const secondMeta = fixtures.requests.buildMetadata({ blockNumber: 101, transactionHash: '0xb' });
    const thirdMeta = fixtures.requests.buildMetadata({ blockNumber: 101, transactionHash: '0xc' });

    const first = fixtures.requests.createWithdrawal({
      id: '0x1',
      nonce: undefined,
      metadata: firstMeta,
      requesterIndex: '7',
    });
    const second = fixtures.requests.createWithdrawal({
      id: '0x2',
      nonce: undefined,
      metadata: secondMeta,
      requesterIndex: '7',
    });
    const third = fixtures.requests.createWithdrawal({
      id: '0x3',
      nonce: undefined,
      metadata: thirdMeta,
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
    expect(res.apiCalls.find((a) => a.id === '0x1')!.nonce).toEqual(11);
    expect(res.apiCalls.find((a) => a.id === '0x2')!.nonce).toEqual(11);
    expect(res.apiCalls.find((a) => a.id === '0x3')!.nonce).toEqual(7);
  });

  it('blocks further nonce assignment if a request is within the ignore blocked requests limit', () => {
    const meta = { currentBlock: 110, ignoreBlockedRequestsAfterBlocks: 100 };
    const firstMeta = fixtures.requests.buildMetadata({ ...meta, blockNumber: 100, transactionHash: '0xa' });
    const secondMeta = fixtures.requests.buildMetadata({ ...meta, blockNumber: 101, transactionHash: '0xb' });
    const thirdMeta = fixtures.requests.buildMetadata({ ...meta, blockNumber: 101, transactionHash: '0xc' });

    // The second request is blocked
    const first = fixtures.requests.createApiCall({
      id: '0x1',
      nonce: undefined,
      metadata: firstMeta,
      requesterIndex: '3',
    });
    const second = fixtures.requests.createApiCall({
      id: '0x2',
      nonce: undefined,
      metadata: secondMeta,
      status: RequestStatus.Blocked,
      requesterIndex: '3',
    });
    const third = fixtures.requests.createApiCall({
      id: '0x3',
      nonce: undefined,
      metadata: thirdMeta,
      requesterIndex: '3',
    });

    const requests: GroupedRequests = {
      apiCalls: shuffle([third, second, first]),
      withdrawals: [],
    };
    const transactionCountsByRequesterIndex = { 3: 7 };
    const state = providerState.update(initialState, {
      requests,
      transactionCountsByRequesterIndex,
    });
    const res = nonces.assign(state);
    expect(res.apiCalls[0]).toEqual({ ...first, nonce: 7 });
    expect(res.apiCalls[1]).toEqual({ ...second, nonce: undefined });
    expect(res.apiCalls[2]).toEqual({ ...third, nonce: undefined });
  });

  it('ignores blocked requests if the ignore blocked requests limit has passed', () => {
    const meta = { currentBlock: 110, ignoreBlockedRequestsAfterBlocks: 1 };
    const firstMeta = fixtures.requests.buildMetadata({ ...meta, blockNumber: 100, transactionHash: '0xa' });
    const secondMeta = fixtures.requests.buildMetadata({ ...meta, blockNumber: 101, transactionHash: '0xb' });
    const thirdMeta = fixtures.requests.buildMetadata({ ...meta, blockNumber: 101, transactionHash: '0xc' });

    // The second request is blocked
    const first = fixtures.requests.createApiCall({
      id: '0x1',
      nonce: undefined,
      metadata: firstMeta,
      requesterIndex: '3',
    });
    const second = fixtures.requests.createApiCall({
      id: '0x2',
      nonce: undefined,
      metadata: secondMeta,
      requesterIndex: '3',
      status: RequestStatus.Blocked,
    });
    const third = fixtures.requests.createApiCall({
      id: '0x3',
      nonce: undefined,
      metadata: thirdMeta,
      requesterIndex: '3',
    });

    const requests: GroupedRequests = {
      apiCalls: shuffle([third, second, first]),
      withdrawals: [],
    };
    const transactionCountsByRequesterIndex = { 3: 7 };
    const state = providerState.update(initialState, {
      requests,
      transactionCountsByRequesterIndex,
    });
    const res = nonces.assign(state);
    expect(res.apiCalls[0]).toEqual({ ...first, nonce: 7 });
    expect(res.apiCalls[1]).toEqual({ ...second, nonce: undefined });
    expect(res.apiCalls[2]).toEqual({ ...third, nonce: 8 });
  });
});
