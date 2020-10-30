import shuffle from 'lodash/shuffle';
import * as fixtures from 'test/fixtures';
import * as sorting from './sorting';

describe('sortGroupedRequests', () => {
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

    const requests = {
      apiCalls: shuffle([third, second, fourth, first]),
      withdrawals: [],
    };

    const res = sorting.sortGroupedRequests(requests);
    expect(res).toEqual({
      42: {
        apiCalls: [first, second, third, fourth],
        withdrawals: [],
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

    const requests = {
      apiCalls: [],
      withdrawals: shuffle([third, second, fourth, first]),
    };

    const res = sorting.sortGroupedRequests(requests);
    expect(res).toEqual({
      42: {
        apiCalls: [],
        withdrawals: [first, second, third, fourth],
      },
    });
  });
});
