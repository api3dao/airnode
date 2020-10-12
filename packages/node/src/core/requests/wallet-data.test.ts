import * as fixtures from 'test/fixtures';
import * as walletData from './wallet-data';
import { WalletDataByIndex } from 'src/types';

describe('hasNoRequests', () => {
  it('checks that there is at least one request across multiple wallets', () => {
    const walletDataByIndex: WalletDataByIndex = {
      5: {
        address: '0x1',
        requests: {
          apiCalls: [],
          withdrawals: [],
        },
        transactionCount: 8,
      },
      7: {
        address: '0x2',
        requests: {
          apiCalls: [],
          withdrawals: [fixtures.requests.createWithdrawal()],
        },
        transactionCount: 2,
      },
    };
    expect(walletData.hasNoRequests(walletDataByIndex)).toEqual(false);
  });

  it('returns false if API calls are present', () => {
    const walletDataByIndex: WalletDataByIndex = {
      5: {
        address: '0x1',
        requests: {
          apiCalls: [fixtures.requests.createApiCall()],
          withdrawals: [],
        },
        transactionCount: 8,
      },
    };
    expect(walletData.hasNoRequests(walletDataByIndex)).toEqual(false);
  });

  it('returns false if withdrawals are present', () => {
    const walletDataByIndex: WalletDataByIndex = {
      9: {
        address: '0x1',
        requests: {
          apiCalls: [],
          withdrawals: [fixtures.requests.createWithdrawal()],
        },
        transactionCount: 8,
      },
    };
    expect(walletData.hasNoRequests(walletDataByIndex)).toEqual(false);
  });

  it('returns true if there are no requests present', () => {
    const walletDataByIndex: WalletDataByIndex = {
      9: {
        address: '0x1',
        requests: {
          apiCalls: [],
          withdrawals: [],
        },
        transactionCount: 8,
      },
    };
    expect(walletData.hasNoRequests(walletDataByIndex)).toEqual(true);
  });
});
