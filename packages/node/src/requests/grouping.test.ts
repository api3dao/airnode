import * as grouping from './grouping';
import * as fixtures from '../../test/fixtures';
import { GroupedRequests } from '../types';

describe('mapUniqueRequesterIndices', () => {
  it('returns a unique list of requester indices', () => {
    const apiCalls = [
      fixtures.requests.buildApiCall({ requesterIndex: '8' }),
      fixtures.requests.buildApiCall({ requesterIndex: '9' }),
      fixtures.requests.buildApiCall({ requesterIndex: '9' }),
      fixtures.requests.buildApiCall({ requesterIndex: '10' }),
    ];
    const withdrawals = [
      fixtures.requests.buildWithdrawal({ requesterIndex: '9' }),
      fixtures.requests.buildWithdrawal({ requesterIndex: '12' }),
    ];
    const requests: GroupedRequests = {
      apiCalls: apiCalls,
      withdrawals: withdrawals,
    };
    const res = grouping.mapUniqueRequesterIndices(requests);
    expect(res).toEqual(['8', '9', '10', '12']);
  });
});

describe('groupRequestsByRequesterIndex', () => {
  it('groups all requests by wallet index', () => {
    const apiCalls = [
      fixtures.requests.buildApiCall({ requesterIndex: '8' }),
      fixtures.requests.buildApiCall({ requesterIndex: '9' }),
      fixtures.requests.buildApiCall({ requesterIndex: '9' }),
      fixtures.requests.buildApiCall({ requesterIndex: '10' }),
    ];
    const withdrawals = [
      fixtures.requests.buildWithdrawal({ requesterIndex: '9' }),
      fixtures.requests.buildWithdrawal({ requesterIndex: '12' }),
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
