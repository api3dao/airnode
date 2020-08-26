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
import { ProviderState } from 'src/types';
import * as providerState from '../providers/state';
import * as transactions from './transaction-counts';

describe('getTransactionCountByIndex', () => {
  let initialState: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    initialState = providerState.create(config, 0);
  });

  it('calls getTransactionCount once for each unique wallet index', async () => {
    getTransactionCountMock.mockResolvedValueOnce(5);

    const walletData = {
      address: '0x1',
      requests: {
        apiCalls: [fixtures.requests.createApiCall({ walletIndex: '2' })],
        walletDesignations: [],
        withdrawals: [fixtures.requests.createWithdrawal({ walletIndex: '2' })],
      },
      transactionCount: 2,
    };
    const state = providerState.update(initialState, { walletDataByIndex: { 2: walletData } });

    const res = await transactions.getTransactionCountByIndex(state);
    expect(res).toEqual({ 2: 5 });
    expect(getTransactionCountMock).toHaveBeenCalledTimes(1);
    expect(getTransactionCountMock).toHaveBeenCalledWith('0x6722FC66C05d7092833CC772fD2C00Fdc0f939a6', 123456);
  });

  it('returns transaction counts for multiple wallets', async () => {
    getTransactionCountMock.mockResolvedValueOnce(45);
    getTransactionCountMock.mockResolvedValueOnce(123);
    getTransactionCountMock.mockResolvedValueOnce(5);

    const walletData0 = {
      address: '0x0',
      requests: {
        apiCalls: [],
        walletDesignations: [
          fixtures.requests.createWalletDesignation(),
          fixtures.requests.createWalletDesignation(),
        ],
        withdrawals: [],
      },
      transactionCount: 2,
    };

    const walletData1 = {
      address: '0x1',
      requests: {
        apiCalls: [fixtures.requests.createApiCall()],
        walletDesignations: [],
        withdrawals: [fixtures.requests.createWithdrawal()],
      },
      transactionCount: 2,
    };
    const walletData2 = {
      address: '0x2',
      requests: {
        apiCalls: [fixtures.requests.createApiCall()],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 5,
    };

    const walletDataByIndex = { 0: walletData0, 7: walletData1, 9: walletData2 };
    const state = providerState.update(initialState, { walletDataByIndex });

    const res = await transactions.getTransactionCountByIndex(state);
    expect(res).toEqual({ 0: 45, 7: 123, 9: 5 });
    expect(getTransactionCountMock).toHaveBeenCalledTimes(3);
  });

  it('retries once on failure', async () => {
    getTransactionCountMock.mockRejectedValueOnce(new Error('Server says no'));
    getTransactionCountMock.mockResolvedValueOnce(123);

    const walletData = {
      address: '0x1',
      requests: {
        apiCalls: [fixtures.requests.createApiCall({ walletIndex: '9' })],
        walletDesignations: [],
        withdrawals: [fixtures.requests.createWithdrawal({ walletIndex: '9' })],
      },
      transactionCount: 2,
    };
    const state = providerState.update(initialState, { walletDataByIndex: { 9: walletData } });

    const res = await transactions.getTransactionCountByIndex(state);
    expect(res).toEqual({ 9: 123 });
    expect(getTransactionCountMock).toHaveBeenCalledTimes(2);
  });

  it('retries a maximum of two times', async () => {
    getTransactionCountMock.mockRejectedValueOnce(new Error('Server says no'));
    getTransactionCountMock.mockRejectedValueOnce(new Error('Server says no'));
    getTransactionCountMock.mockResolvedValueOnce(123);

    const walletData = {
      address: '0x1',
      requests: {
        apiCalls: [fixtures.requests.createApiCall({ walletIndex: '2' })],
        walletDesignations: [],
        withdrawals: [fixtures.requests.createWithdrawal({ walletIndex: '2' })],
      },
      transactionCount: 2,
    };
    const state = providerState.update(initialState, { walletDataByIndex: { 2: walletData } });

    const res = await transactions.getTransactionCountByIndex(state);
    expect(res).toEqual({});
    expect(getTransactionCountMock).toHaveBeenCalledTimes(2);
  });
});
