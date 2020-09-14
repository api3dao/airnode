import shuffle from 'lodash/shuffle';
import * as fixtures from 'test/fixtures';
import { WalletDataByIndex } from 'src/types';
import * as sorting from './sorting';

describe('sortRequests', () => {
  it('sorts API calls by block number then by transaction hash', () => {
    const first = fixtures.requests.createApiCall({ logMetadata: { blockNumber: 100, transactionHash: '0x1' } });
    const second = fixtures.requests.createApiCall({ logMetadata: { blockNumber: 100, transactionHash: '0x2' } });
    const third = fixtures.requests.createApiCall({ logMetadata: { blockNumber: 101, transactionHash: '0x3' } });
    const fourth = fixtures.requests.createApiCall({ logMetadata: { blockNumber: 101, transactionHash: '0x4' } });

    const walletDataByIndex: WalletDataByIndex = {
      42: {
        address: '0x76e1fe9D5a433FbC2bc0876db3F08f71D3C1d938',
        requests: {
          apiCalls: shuffle([third, second, fourth, first]),
          walletDesignations: [],
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
          walletDesignations: [],
          withdrawals: [],
        },
        transactionCount: 0,
      },
    });
  });

  it('sorts wallet designations by block number then by transaction hash', () => {
    const first = fixtures.requests.createWalletDesignation({
      logMetadata: { blockNumber: 100, transactionHash: '0x1' },
    });
    const second = fixtures.requests.createWalletDesignation({
      logMetadata: { blockNumber: 100, transactionHash: '0x2' },
    });
    const third = fixtures.requests.createWalletDesignation({
      logMetadata: { blockNumber: 101, transactionHash: '0x3' },
    });
    const fourth = fixtures.requests.createWalletDesignation({
      logMetadata: { blockNumber: 101, transactionHash: '0x4' },
    });

    const walletDataByIndex: WalletDataByIndex = {
      0: {
        address: '0x566954B6E04BDb789e7d1118e3dC1AC9A34A8B44',
        requests: {
          apiCalls: [],
          walletDesignations: shuffle([fourth, second, first, third]),
          withdrawals: [],
        },
        transactionCount: 0,
      },
    };

    const res = sorting.sortRequestsByWalletIndex(walletDataByIndex);
    expect(res).toEqual({
      0: {
        address: '0x566954B6E04BDb789e7d1118e3dC1AC9A34A8B44',
        requests: {
          apiCalls: [],
          walletDesignations: [first, second, third, fourth],
          withdrawals: [],
        },
        transactionCount: 0,
      },
    });
  });

  it('sorts withdrawals by block number then by transaction hash', () => {
    const first = fixtures.requests.createWithdrawal({ logMetadata: { blockNumber: 100, transactionHash: '0x1' } });
    const second = fixtures.requests.createWithdrawal({ logMetadata: { blockNumber: 100, transactionHash: '0x2' } });
    const third = fixtures.requests.createWithdrawal({ logMetadata: { blockNumber: 101, transactionHash: '0x3' } });
    const fourth = fixtures.requests.createWithdrawal({ logMetadata: { blockNumber: 101, transactionHash: '0x4' } });

    const walletDataByIndex: WalletDataByIndex = {
      42: {
        address: '0x76e1fe9D5a433FbC2bc0876db3F08f71D3C1d938',
        requests: {
          apiCalls: [],
          walletDesignations: [],
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
          walletDesignations: [],
          withdrawals: [first, second, third, fourth],
        },
        transactionCount: 0,
      },
    });
  });
});
