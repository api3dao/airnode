import shuffle from 'lodash/shuffle';
import * as fixtures from 'test/fixtures';
import { WalletDataByIndex } from 'src/types';
import * as sorting from './sorting';

describe('sortRequests', () => {
  it('sorts API calls by block number then by transaction hash', () => {
    const first = fixtures.requests.createApiCall({
      metadata: { blockNumber: 100, transactionHash: '0x1' },
    });
    const second = fixtures.requests.createApiCall({
      metadata: { blockNumber: 100, transactionHash: '0x2' },
    });
    const third = fixtures.requests.createApiCall({
      metadata: { blockNumber: 101, transactionHash: '0x3' },
    });
    const fourth = fixtures.requests.createApiCall({
      metadata: { blockNumber: 101, transactionHash: '0x4' },
    });

    const walletDataByIndex: WalletDataByIndex = {
      42: {
        address: '0x76e1fe9D5a433FbC2bc0876db3F08f71D3C1d938',
        requests: {
          apiCalls: shuffle([third, second, fourth, first]),
          withdrawals: [],
        },
        transactionCount: 0,
      },
    };

    const res = sorting.sortRequestsByWalletIndex(walletDataByIndex);
    expect(res).toEqual({
      42: {
        address: '0x76e1fe9D5a433FbC2bc0876db3F08f71D3C1d938',
        requests: {
          apiCalls: [first, second, third, fourth],
          withdrawals: [],
        },
        transactionCount: 0,
      },
    });
  });

  it('sorts withdrawals by block number then by transaction hash', () => {
    const first = fixtures.requests.createWithdrawal({
      metadata: { blockNumber: 100, transactionHash: '0x1' },
    });
    const second = fixtures.requests.createWithdrawal({
      metadata: { blockNumber: 100, transactionHash: '0x2' },
    });
    const third = fixtures.requests.createWithdrawal({
      metadata: { blockNumber: 101, transactionHash: '0x3' },
    });
    const fourth = fixtures.requests.createWithdrawal({
      metadata: { blockNumber: 101, transactionHash: '0x4' },
    });

    const walletDataByIndex: WalletDataByIndex = {
      42: {
        address: '0x76e1fe9D5a433FbC2bc0876db3F08f71D3C1d938',
        requests: {
          apiCalls: [],
          withdrawals: shuffle([third, second, fourth, first]),
        },
        transactionCount: 0,
      },
    };

    const res = sorting.sortRequestsByWalletIndex(walletDataByIndex);
    expect(res).toEqual({
      42: {
        address: '0x76e1fe9D5a433FbC2bc0876db3F08f71D3C1d938',
        requests: {
          apiCalls: [],
          withdrawals: [first, second, third, fourth],
        },
        transactionCount: 0,
      },
    });
  });
});
