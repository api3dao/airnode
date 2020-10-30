import { GroupedRequests } from 'src/types';
import * as fixtures from 'test/fixtures';
import * as grouping from './grouping';

describe('groupRequestsByRequesterIndex', () => {
  it('groups all requests by wallet index', () => {
    const apiCalls = [
      fixtures.requests.createApiCall({ requesterIndex: '8' }),
      fixtures.requests.createApiCall({ requesterIndex: '9' }),
      fixtures.requests.createApiCall({ requesterIndex: '9' }),
      fixtures.requests.createApiCall({ requesterIndex: '10' }),
    ];
    const withdrawals = [
      fixtures.requests.createWithdrawal({ requesterIndex: '9' }),
      fixtures.requests.createWithdrawal({ requesterIndex: '12' }),
    ];
    const requests: GroupedRequests = {
      apiCalls: apiCalls,
      withdrawals: withdrawals,
    };

    const res = grouping.groupRequestsByRequesterIndex(requests);
    expect(res).toEqual({
      8: {
        apiCalls: [apiCalls[0]],
        withdrawals: [],
      },
      9: {
        apiCalls: [apiCalls[1], apiCalls[2]],
        withdrawals: [withdrawals[0]],
      },
      10: {
        apiCalls: [apiCalls[3]],
        withdrawals: [],
      },
      12: {
        apiCalls: [],
        withdrawals: [withdrawals[1]],
      },
    });
  });
});
