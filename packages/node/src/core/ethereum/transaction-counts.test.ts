const getTransactionCountMock = jest.fn();
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ethers: {
      ...original,
      providers: {
        JsonRpcProvider: jest.fn().mockImplementation(() => ({
          getTransactionCount: getTransactionCountMock,
        })),
      },
    },
  };
});

const providerId = '0xdf6677e5e84719a54ed715e7b341becf4e9afda7478baa89b5c6f449ff2b7259';
jest.mock('../config', () => ({
  config: {
    nodeSettings: {
      providerId,
    },
  },
  security: {
    masterKeyMnemonic: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
  },
}));

import * as fixtures from 'test/fixtures';
import { GroupedRequests, ProviderState } from 'src/types';
import * as providerState from '../providers/state';
import * as transactions from './transaction-counts';

describe('getTransactionCountByIndex', () => {
  let initialState: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    initialState = providerState.create(config, 0);
  });

  it('gets the admin wallet transaction count if there are any wallet designations', async () => {
    getTransactionCountMock.mockResolvedValueOnce(72);

    const requests: GroupedRequests = {
      apiCalls: [],
      withdrawals: [],
      walletDesignations: [
        fixtures.requests.createWalletDesignation({ walletIndex: '9' }),
        fixtures.requests.createWalletDesignation({ walletIndex: '10' }),
      ],
    };
    const state = providerState.update(initialState, { currentBlock: 123456, requests });

    const res = await transactions.getTransactionCountByIndex(state);
    expect(res).toEqual({ 0: 72 });
    expect(getTransactionCountMock).toHaveBeenCalledTimes(1);
    expect(getTransactionCountMock).toHaveBeenCalledWith('0x566954B6E04BDb789e7d1118e3dC1AC9A34A8B44', 123456);
  });

  it('calls getTransactionCount once for each unique wallet index', async () => {
    getTransactionCountMock.mockResolvedValueOnce(5);

    const requests: GroupedRequests = {
      apiCalls: [fixtures.requests.createApiCall({ walletIndex: '2' })],
      withdrawals: [fixtures.requests.createWithdrawal({ walletIndex: '2' })],
      walletDesignations: [],
    };
    const state = providerState.update(initialState, { currentBlock: 123456, requests });

    const res = await transactions.getTransactionCountByIndex(state);
    expect(res).toEqual({ 2: 5 });

    expect(getTransactionCountMock).toHaveBeenCalledTimes(1);
    expect(getTransactionCountMock).toHaveBeenCalledWith('0x6722FC66C05d7092833CC772fD2C00Fdc0f939a6', 123456);
  });

  it('returns transaction counts for multiple wallets', async () => {
    getTransactionCountMock.mockResolvedValueOnce(5);
    getTransactionCountMock.mockResolvedValueOnce(123);
    getTransactionCountMock.mockResolvedValueOnce(45);

    const requests: GroupedRequests = {
      apiCalls: [fixtures.requests.createApiCall({ walletIndex: '9' })],
      withdrawals: [fixtures.requests.createWithdrawal({ walletIndex: '7' })],
      walletDesignations: [fixtures.requests.createWalletDesignation({ walletIndex: '11' })],
    };
    const state = providerState.update(initialState, { currentBlock: 123456, requests });

    const res = await transactions.getTransactionCountByIndex(state);
    expect(res).toEqual({ 0: 45, 9: 5, 7: 123 });
    expect(getTransactionCountMock).toHaveBeenCalledTimes(3);
  });

  it('retries once on failure', async () => {
    getTransactionCountMock.mockRejectedValueOnce(new Error('Server says no'));
    getTransactionCountMock.mockResolvedValueOnce(123);

    const requests: GroupedRequests = {
      apiCalls: [fixtures.requests.createApiCall({ walletIndex: '9' })],
      withdrawals: [],
      walletDesignations: [],
    };
    const state = providerState.update(initialState, { currentBlock: 123456, requests });

    const res = await transactions.getTransactionCountByIndex(state);
    expect(res).toEqual({ 9: 123 });
    expect(getTransactionCountMock).toHaveBeenCalledTimes(2);
  });

  it('retries a maximum of two times', async () => {
    getTransactionCountMock.mockRejectedValueOnce(new Error('Server says no'));
    getTransactionCountMock.mockRejectedValueOnce(new Error('Server says no'));
    getTransactionCountMock.mockResolvedValueOnce(123);

    const requests: GroupedRequests = {
      apiCalls: [fixtures.requests.createApiCall({ walletIndex: '9' })],
      withdrawals: [],
      walletDesignations: [],
    };
    const state = providerState.update(initialState, { currentBlock: 123456, requests });

    const res = await transactions.getTransactionCountByIndex(state);
    expect(res).toEqual({});
    expect(getTransactionCountMock).toHaveBeenCalledTimes(2);
  });
});
