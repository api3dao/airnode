import * as grouping from './grouping';
import * as fixtures from '../../test/fixtures';
import { GroupedRequests } from '../types';

describe('mapUniqueSponsors', () => {
  it('returns a unique list of sponsors', () => {
    const apiCalls = [
      fixtures.requests.buildApiCall({ sponsorAddress: '8' }), //TODO: fix value
      fixtures.requests.buildApiCall({ sponsorAddress: '9' }), //TODO: fix value
      fixtures.requests.buildApiCall({ sponsorAddress: '9' }), //TODO: fix value
      fixtures.requests.buildApiCall({ sponsorAddress: '10' }), //TODO: fix value
    ];
    const withdrawals = [
      fixtures.requests.buildWithdrawal({ sponsorAddress: '9' }), //TODO: fix value
      fixtures.requests.buildWithdrawal({ sponsorAddress: '12' }), //TODO: fix value
    ];
    const requests: GroupedRequests = {
      apiCalls: apiCalls,
      withdrawals: withdrawals,
    };
    const res = grouping.mapUniqueSponsorAddresses(requests);
    expect(res).toEqual(['8', '9', '10', '12']); //TODO: fix value
  });
});

describe('groupRequestsBySponsor', () => {
  it('groups all requests by sponsor', () => {
    const apiCalls = [
      fixtures.requests.buildApiCall({ sponsorAddress: '8' }), //TODO: fix value
      fixtures.requests.buildApiCall({ sponsorAddress: '9' }), //TODO: fix value
      fixtures.requests.buildApiCall({ sponsorAddress: '9' }), //TODO: fix value
      fixtures.requests.buildApiCall({ sponsorAddress: '10' }), //TODO: fix value
    ];
    const withdrawals = [
      fixtures.requests.buildWithdrawal({ sponsorAddress: '9' }), //TODO: fix value
      fixtures.requests.buildWithdrawal({ sponsorAddress: '12' }), //TODO: fix value
    ];
    const requests: GroupedRequests = {
      apiCalls: apiCalls,
      withdrawals: withdrawals,
    };

    const res = grouping.groupRequestsBySponsorAddress(requests);
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
