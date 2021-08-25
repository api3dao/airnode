import shuffle from 'lodash/shuffle';
import * as nonces from './nonces';
import * as fixtures from '../../test/fixtures';
import * as providerState from '../providers/state';
import { EVMProviderState, GroupedRequests, ProviderState, RequestStatus } from '../types';

describe('assign', () => {
  let mutableInitialState: ProviderState<EVMProviderState>;

  beforeEach(() => {
    mutableInitialState = fixtures.buildEVMProviderState();
  });

  it('sorts and assigns nonces requests API calls', () => {
    const firstMeta = fixtures.requests.buildMetadata({ blockNumber: 100, transactionHash: '0xa' });
    const secondMeta = fixtures.requests.buildMetadata({ blockNumber: 101, transactionHash: '0xb' });
    const thirdMeta = fixtures.requests.buildMetadata({ blockNumber: 101, transactionHash: '0xc' });

    const first = fixtures.requests.buildApiCall({
      id: '0x1',
      nonce: undefined,
      metadata: firstMeta,
      sponsorAddress: '5', //TODO: fix value
    });
    const second = fixtures.requests.buildApiCall({
      id: '0x2',
      nonce: undefined,
      metadata: secondMeta,
      sponsorAddress: '5', //TODO: fix value
    });
    const third = fixtures.requests.buildApiCall({
      id: '0x3',
      nonce: undefined,
      metadata: thirdMeta,
      sponsorAddress: '5', //TODO: fix value
    });

    const requests: GroupedRequests = {
      apiCalls: shuffle([third, second, first]),
      withdrawals: [],
    };
    const transactionCountsBySponsorAddress = { 5: 3 }; //TODO: fix value
    const state = providerState.update(mutableInitialState, {
      requests,
      transactionCountsBySponsorAddress,
    });
    const res = nonces.assign(state);
    expect(res.apiCalls[0]).toEqual({ ...first, nonce: 3 });
    expect(res.apiCalls[1]).toEqual({ ...second, nonce: 4 });
    expect(res.apiCalls[2]).toEqual({ ...third, nonce: 5 });
  });

  it('sorts and assigns nonces requests withdrawals', () => {
    const firstMeta = fixtures.requests.buildMetadata({ blockNumber: 100, transactionHash: '0xa' });
    const secondMeta = fixtures.requests.buildMetadata({ blockNumber: 101, transactionHash: '0xb' });
    const thirdMeta = fixtures.requests.buildMetadata({ blockNumber: 101, transactionHash: '0xc' });

    const first = fixtures.requests.buildWithdrawal({
      id: '0x1',
      nonce: undefined,
      metadata: firstMeta,
      sponsorAddress: '7', //TODO: fix value
    });
    const second = fixtures.requests.buildWithdrawal({
      id: '0x2',
      nonce: undefined,
      metadata: secondMeta,
      sponsorAddress: '7', //TODO: fix value
    });
    const third = fixtures.requests.buildWithdrawal({
      id: '0x3',
      nonce: undefined,
      metadata: thirdMeta,
      sponsorAddress: '7', //TODO: fix value
    });

    const requests: GroupedRequests = {
      apiCalls: [],
      withdrawals: shuffle([first, third, second]),
    };
    const transactionCountsBySponsorAddress = { 7: 11 }; //TODO: fix value
    const state = providerState.update(mutableInitialState, {
      requests,
      transactionCountsBySponsorAddress,
    });
    const res = nonces.assign(state);
    expect(res.withdrawals[0]).toEqual({ ...first, nonce: 11 });
    expect(res.withdrawals[1]).toEqual({ ...second, nonce: 12 });
    expect(res.withdrawals[2]).toEqual({ ...third, nonce: 13 });
  });

  it('does not share nonces between sponsors', () => {
    const requests: GroupedRequests = {
      apiCalls: [
        fixtures.requests.buildApiCall({ id: '0x1', sponsorAddress: '7', nonce: undefined }), //TODO: fix value
        fixtures.requests.buildApiCall({ id: '0x2', sponsorAddress: '8', nonce: undefined }), //TODO: fix value
        fixtures.requests.buildApiCall({ id: '0x3', sponsorAddress: '9', nonce: undefined }), //TODO: fix value
      ],
      withdrawals: [],
    };
    const transactionCountsBySponsorAddress = { 7: 11, 8: 11, 9: 7 }; //TODO: fix value
    const state = providerState.update(mutableInitialState, {
      requests,
      transactionCountsBySponsorAddress,
    });
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
    const first = fixtures.requests.buildApiCall({
      id: '0x1',
      nonce: undefined,
      metadata: firstMeta,
      sponsorAddress: '3', //TODO: fix value
    });
    const second = fixtures.requests.buildApiCall({
      id: '0x2',
      nonce: undefined,
      metadata: secondMeta,
      status: RequestStatus.Blocked,
      sponsorAddress: '3', //TODO: fix value
    });
    const third = fixtures.requests.buildApiCall({
      id: '0x3',
      nonce: undefined,
      metadata: thirdMeta,
      sponsorAddress: '3', //TODO: fix value
    });

    const requests: GroupedRequests = {
      apiCalls: shuffle([third, second, first]),
      withdrawals: [],
    };
    const transactionCountsBySponsorAddress = { 3: 7 }; //TODO: fix value
    const state = providerState.update(mutableInitialState, {
      requests,
      transactionCountsBySponsorAddress,
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
    const first = fixtures.requests.buildApiCall({
      id: '0x1',
      nonce: undefined,
      metadata: firstMeta,
      sponsorAddress: '3', //TODO: fix value
    });
    const second = fixtures.requests.buildApiCall({
      id: '0x2',
      nonce: undefined,
      metadata: secondMeta,
      sponsorAddress: '3', //TODO: fix value
      status: RequestStatus.Blocked,
    });
    const third = fixtures.requests.buildApiCall({
      id: '0x3',
      nonce: undefined,
      metadata: thirdMeta,
      sponsorAddress: '3', //TODO: fix value
    });

    const requests: GroupedRequests = {
      apiCalls: shuffle([third, second, first]),
      withdrawals: [],
    };
    const transactionCountsBySponsorAddress = { 3: 7 }; //TODO: fix value
    const state = providerState.update(mutableInitialState, {
      requests,
      transactionCountsBySponsorAddress,
    });
    const res = nonces.assign(state);
    expect(res.apiCalls[0]).toEqual({ ...first, nonce: 7 });
    expect(res.apiCalls[1]).toEqual({ ...second, nonce: undefined });
    expect(res.apiCalls[2]).toEqual({ ...third, nonce: 8 });
  });

  it('does not assign nonces to fulfilled requests', () => {
    const firstMeta = fixtures.requests.buildMetadata({ blockNumber: 100, transactionHash: '0xa' });
    const secondMeta = fixtures.requests.buildMetadata({ blockNumber: 101, transactionHash: '0xb' });
    const thirdMeta = fixtures.requests.buildMetadata({ blockNumber: 101, transactionHash: '0xc' });

    const first = fixtures.requests.buildWithdrawal({
      id: '0x1',
      nonce: undefined,
      metadata: firstMeta,
      sponsorAddress: '7', //TODO: fix value
      status: RequestStatus.Pending,
    });
    const second = fixtures.requests.buildWithdrawal({
      id: '0x2',
      nonce: undefined,
      metadata: secondMeta,
      sponsorAddress: '7', //TODO: fix value
      status: RequestStatus.Fulfilled,
    });
    const third = fixtures.requests.buildWithdrawal({
      id: '0x3',
      nonce: undefined,
      metadata: thirdMeta,
      sponsorAddress: '7', //TODO: fix value
      status: RequestStatus.Pending,
    });

    const requests: GroupedRequests = {
      apiCalls: [],
      withdrawals: shuffle([first, third, second]),
    };
    const transactionCountsBySponsorAddress = { 7: 11 }; //TODO: fix value
    const state = providerState.update(mutableInitialState, {
      requests,
      transactionCountsBySponsorAddress,
    });
    const res = nonces.assign(state);
    expect(res.withdrawals[0]).toEqual({ ...first, nonce: 11 });
    expect(res.withdrawals[1]).toEqual({ ...second, nonce: undefined });
    expect(res.withdrawals[2]).toEqual({ ...third, nonce: 12 });
  });
});
