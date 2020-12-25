import shuffle from 'lodash/shuffle';
import * as fixtures from 'test/fixtures';
import * as sorting from './sorting';

describe('sortGroupedRequests', () => {
  it('sorts API calls by block number then by transaction hash', () => {
    const firstMeta = fixtures.requests.buildMetadata({ blockNumber: 100, transactionHash: '0x1' });
    const secondMeta = fixtures.requests.buildMetadata({ blockNumber: 100, transactionHash: '0x2' });
    const thirdMeta = fixtures.requests.buildMetadata({ blockNumber: 101, transactionHash: '0x3' });
    const fourthMeta = fixtures.requests.buildMetadata({ blockNumber: 101, transactionHash: '0x4' });

    const first = fixtures.requests.createApiCall({ metadata: firstMeta });
    const second = fixtures.requests.createApiCall({ metadata: secondMeta });
    const third = fixtures.requests.createApiCall({ metadata: thirdMeta });
    const fourth = fixtures.requests.createApiCall({ metadata: fourthMeta });

    const requests = {
      apiCalls: shuffle([third, second, fourth, first]),
      withdrawals: [],
    };

    const res = sorting.sortGroupedRequests(requests);
    expect(res).toEqual({
      apiCalls: [first, second, third, fourth],
      withdrawals: [],
    });
  });

  it('sorts withdrawals by block number then by transaction hash', () => {
    const firstMeta = fixtures.requests.buildMetadata({ blockNumber: 100, transactionHash: '0x1' });
    const secondMeta = fixtures.requests.buildMetadata({ blockNumber: 100, transactionHash: '0x2' });
    const thirdMeta = fixtures.requests.buildMetadata({ blockNumber: 101, transactionHash: '0x3' });
    const fourthMeta = fixtures.requests.buildMetadata({ blockNumber: 101, transactionHash: '0x4' });

    const first = fixtures.requests.createWithdrawal({ metadata: firstMeta });
    const second = fixtures.requests.createWithdrawal({ metadata: secondMeta });
    const third = fixtures.requests.createWithdrawal({ metadata: thirdMeta });
    const fourth = fixtures.requests.createWithdrawal({ metadata: fourthMeta });

    const requests = {
      apiCalls: [],
      withdrawals: shuffle([third, second, fourth, first]),
    };

    const res = sorting.sortGroupedRequests(requests);
    expect(res).toEqual({
      apiCalls: [],
      withdrawals: [first, second, third, fourth],
    });
  });
});
