import shuffle from 'lodash/shuffle';
import * as fixtures from 'test/fixtures';
import { ProviderState, RequestStatus, WalletData } from 'src/types';
import * as providerState from '../providers/state';
import * as nonces from './nonces';

describe('assign', () => {
  let initialState: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    initialState = providerState.create(config, 0);
  });

  it('sorts and assigns nonces requests API calls', () => {
    const first = fixtures.requests.createApiCall({
      id: '0x1',
      nonce: undefined,
      logMetadata: { blockNumber: 100, transactionHash: '0xa' },
    });
    const second = fixtures.requests.createApiCall({
      id: '0x2',
      nonce: undefined,
      logMetadata: { blockNumber: 101, transactionHash: '0xb' },
    });
    const third = fixtures.requests.createApiCall({
      id: '0x3',
      nonce: undefined,
      logMetadata: { blockNumber: 101, transactionHash: '0xc' },
    });
    const walletData: WalletData = {
      address: '0xwallet1',
      requests: {
        apiCalls: shuffle([third, second, first]),
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 3,
    };
    const state = providerState.update(initialState, { walletDataByIndex: { 3: walletData } });
    const res = nonces.assign(state);
    const assignedReqs = res[3].requests.apiCalls;
    expect(assignedReqs[0]).toEqual({ ...first, nonce: 4 });
    expect(assignedReqs[1]).toEqual({ ...second, nonce: 5 });
    expect(assignedReqs[2]).toEqual({ ...third, nonce: 6 });
  });

  it('sorts and assigns nonces to wallet designations', () => {
    const first = fixtures.requests.createWalletDesignation({
      id: '0x1',
      nonce: undefined,
      logMetadata: { blockNumber: 100, transactionHash: '0xa' },
    });
    const second = fixtures.requests.createWalletDesignation({
      id: '0x2',
      nonce: undefined,
      logMetadata: { blockNumber: 101, transactionHash: '0xb' },
    });
    const third = fixtures.requests.createWalletDesignation({
      id: '0x3',
      nonce: undefined,
      logMetadata: { blockNumber: 101, transactionHash: '0xc' },
    });
    const walletData: WalletData = {
      address: '0xwallet1',
      requests: {
        apiCalls: [],
        walletDesignations: shuffle([second, third, first]),
        withdrawals: [],
      },
      transactionCount: 7,
    };
    const state = providerState.update(initialState, { walletDataByIndex: { 0: walletData } });
    const res = nonces.assign(state);
    const assignedReqs = res[0].requests.walletDesignations;
    expect(assignedReqs[0]).toEqual({ ...first, nonce: 8 });
    expect(assignedReqs[1]).toEqual({ ...second, nonce: 9 });
    expect(assignedReqs[2]).toEqual({ ...third, nonce: 10 });
  });

  it('sorts and assigns nonces requests withdrawals', () => {
    const first = fixtures.requests.createWithdrawal({
      id: '0x1',
      nonce: undefined,
      logMetadata: { blockNumber: 100, transactionHash: '0xa' },
    });
    const second = fixtures.requests.createWithdrawal({
      id: '0x2',
      nonce: undefined,
      logMetadata: { blockNumber: 101, transactionHash: '0xb' },
    });
    const third = fixtures.requests.createWithdrawal({
      id: '0x3',
      nonce: undefined,
      logMetadata: { blockNumber: 101, transactionHash: '0xc' },
    });
    const walletData: WalletData = {
      address: '0xwallet1',
      requests: {
        apiCalls: [],
        walletDesignations: [],
        withdrawals: shuffle([first, third, second]),
      },
      transactionCount: 11,
    };
    const state = providerState.update(initialState, { walletDataByIndex: { 7: walletData } });
    const res = nonces.assign(state);
    const assignedReqs = res[7].requests.withdrawals;
    expect(assignedReqs[0]).toEqual({ ...first, nonce: 12 });
    expect(assignedReqs[1]).toEqual({ ...second, nonce: 13 });
    expect(assignedReqs[2]).toEqual({ ...third, nonce: 14 });
  });

  it('does not share nonces between wallets', () => {
    const adminWalletData: WalletData = {
      address: '0xadmin',
      requests: {
        apiCalls: [],
        walletDesignations: [fixtures.requests.createWalletDesignation({ id: '0x1', nonce: undefined })],
        withdrawals: [],
      },
      transactionCount: 11,
    };
    const wallet1Data: WalletData = {
      address: '0xwallet1',
      requests: {
        apiCalls: [fixtures.requests.createApiCall({ id: '0x2', nonce: undefined })],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 11,
    };
    const wallet2Data: WalletData = {
      address: '0xwallet2',
      requests: {
        apiCalls: [fixtures.requests.createApiCall({ id: '0x3', nonce: undefined })],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 7,
    };
    const walletDataByIndex = { 0: adminWalletData, 3: wallet1Data, 7: wallet2Data };
    const state = providerState.update(initialState, { walletDataByIndex });
    const res = nonces.assign(state);
    expect(res[0].requests.walletDesignations[0].nonce).toEqual(12);
    expect(res[3].requests.apiCalls[0].nonce).toEqual(12);
    expect(res[7].requests.apiCalls[0].nonce).toEqual(8);
  });

  it('blocks nonce assignment if a request is blocked', () => {
    const first = fixtures.requests.createApiCall({
      id: '0x1',
      nonce: undefined,
      logMetadata: { blockNumber: 100, transactionHash: '0xa' },
    });
    const second = fixtures.requests.createApiCall({
      id: '0x2',
      status: RequestStatus.Blocked,
      nonce: undefined,
      logMetadata: { blockNumber: 101, transactionHash: '0xb' },
    });
    const third = fixtures.requests.createApiCall({
      id: '0x3',
      nonce: undefined,
      logMetadata: { blockNumber: 101, transactionHash: '0xc' },
    });
    const walletData: WalletData = {
      address: '0xwallet1',
      requests: {
        apiCalls: shuffle([third, second, first]),
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 3,
    };
    const state = providerState.update(initialState, { currentBlock: 102, walletDataByIndex: { 3: walletData } });
    const res = nonces.assign(state);
    const assignedReqs = res[3].requests.apiCalls;
    expect(assignedReqs[0]).toEqual({ ...first, nonce: 4 });
    expect(assignedReqs[1]).toEqual({ ...second, nonce: undefined });
    expect(assignedReqs[2]).toEqual({ ...third, nonce: undefined });
  });

  it('skips blocked requests if more than 20 blocks have passed', () => {
    const first = fixtures.requests.createApiCall({
      id: '0x1',
      nonce: undefined,
      logMetadata: { blockNumber: 100, transactionHash: '0xa' },
    });
    const second = fixtures.requests.createApiCall({
      id: '0x2',
      status: RequestStatus.Blocked,
      nonce: undefined,
      logMetadata: { blockNumber: 101, transactionHash: '0xb' },
    });
    const third = fixtures.requests.createApiCall({
      id: '0x3',
      nonce: undefined,
      logMetadata: { blockNumber: 101, transactionHash: '0xc' },
    });
    const walletData: WalletData = {
      address: '0xwallet1',
      requests: {
        apiCalls: shuffle([third, second, first]),
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 3,
    };
    const state = providerState.update(initialState, { currentBlock: 122, walletDataByIndex: { 3: walletData } });
    const res = nonces.assign(state);
    const assignedReqs = res[3].requests.apiCalls;
    expect(assignedReqs[0]).toEqual({ ...first, nonce: 4 });
    expect(assignedReqs[1]).toEqual({ ...second, nonce: undefined });
    expect(assignedReqs[2]).toEqual({ ...third, nonce: 5 });
  });
});
