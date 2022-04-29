import shuffle from 'lodash/shuffle';
import * as sorting from './sorting';
import * as fixtures from '../../test/fixtures';

describe('sortGroupedRequests', () => {
  it('sorts API calls by block number then by transaction hash', () => {
    const firstMeta = fixtures.requests.buildMetadata({ blockNumber: 100, transactionHash: '0x1', logIndex: 0 });
    const secondMeta = fixtures.requests.buildMetadata({ blockNumber: 100, transactionHash: '0x2', logIndex: 2 });
    const thirdMeta = fixtures.requests.buildMetadata({ blockNumber: 101, transactionHash: '0x3', logIndex: 0 });
    const fourthMeta = fixtures.requests.buildMetadata({ blockNumber: 101, transactionHash: '0x4', logIndex: 2 });
    const fifthMeta = fixtures.requests.buildMetadata({ blockNumber: 100, transactionHash: '0x5', logIndex: 1 });
    const sixthMeta = fixtures.requests.buildMetadata({ blockNumber: 101, transactionHash: '0x6', logIndex: 1 });

    const first = fixtures.requests.buildApiCall({ metadata: firstMeta });
    const second = fixtures.requests.buildApiCall({ metadata: secondMeta });
    const third = fixtures.requests.buildApiCall({ metadata: thirdMeta });
    const fourth = fixtures.requests.buildApiCall({ metadata: fourthMeta });
    const fifth = fixtures.requests.buildApiCall({ metadata: fifthMeta });
    const sixth = fixtures.requests.buildApiCall({ metadata: sixthMeta });

    const requests = {
      apiCalls: shuffle([fifth, third, second, fourth, sixth, first]),
      withdrawals: [],
    };

    const res = sorting.sortGroupedRequests(requests);
    expect(res).toEqual({
      apiCalls: [first, fifth, second, third, sixth, fourth],
      withdrawals: [],
    });
  });

  it('sorts withdrawals by block number then by transaction hash', () => {
    const firstMeta = fixtures.requests.buildMetadata({ blockNumber: 100, transactionHash: '0x1', logIndex: 0 });
    const secondMeta = fixtures.requests.buildMetadata({ blockNumber: 100, transactionHash: '0x2', logIndex: 2 });
    const thirdMeta = fixtures.requests.buildMetadata({ blockNumber: 101, transactionHash: '0x3', logIndex: 0 });
    const fourthMeta = fixtures.requests.buildMetadata({ blockNumber: 101, transactionHash: '0x4', logIndex: 2 });
    const fifthMeta = fixtures.requests.buildMetadata({ blockNumber: 100, transactionHash: '0x5', logIndex: 1 });
    const sixthMeta = fixtures.requests.buildMetadata({ blockNumber: 101, transactionHash: '0x6', logIndex: 1 });

    const first = fixtures.requests.buildApiCall({ metadata: firstMeta });
    const second = fixtures.requests.buildApiCall({ metadata: secondMeta });
    const third = fixtures.requests.buildApiCall({ metadata: thirdMeta });
    const fourth = fixtures.requests.buildApiCall({ metadata: fourthMeta });
    const fifth = fixtures.requests.buildApiCall({ metadata: fifthMeta });
    const sixth = fixtures.requests.buildApiCall({ metadata: sixthMeta });

    const requests = {
      apiCalls: [],
      withdrawals: shuffle([fifth, third, second, fourth, sixth, first]),
    };

    const res = sorting.sortGroupedRequests(requests);
    expect(res).toEqual({
      apiCalls: [],
      withdrawals: [first, fifth, second, third, sixth, fourth],
    });
  });
});
