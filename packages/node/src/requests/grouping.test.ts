import * as grouping from './grouping';
import * as fixtures from '../../test/fixtures';
import { GroupedRequests } from '../types';

describe('mapUniqueSponsors', () => {
  it('returns a unique list of sponsors', () => {
    const apiCalls = [
      fixtures.requests.buildApiCall({ sponsorAddress: '0x1d822613f7cC57Be9c9b6C3cC0Bf41b4FB4D97f9' }),
      fixtures.requests.buildApiCall({ sponsorAddress: '0x921e9021F68b89220E4b6C326592Db64D4EF9d67' }),
      fixtures.requests.buildApiCall({ sponsorAddress: '0x921e9021F68b89220E4b6C326592Db64D4EF9d67' }),
      fixtures.requests.buildApiCall({ sponsorAddress: '0x1FfAB99DB981fBef755A4C7d2Ca4EE486c08C5Da' }),
    ];
    const withdrawals = [
      fixtures.requests.buildWithdrawal({ sponsorAddress: '0x921e9021F68b89220E4b6C326592Db64D4EF9d67' }),
      fixtures.requests.buildWithdrawal({ sponsorAddress: '0x9Cc1505E2319334BC195587BDd2d77d939246313' }),
    ];
    const requests: GroupedRequests = {
      apiCalls: apiCalls,
      withdrawals: withdrawals,
    };
    const res = grouping.mapUniqueSponsorAddresses(requests);
    expect(res).toEqual([
      '0x1d822613f7cC57Be9c9b6C3cC0Bf41b4FB4D97f9',
      '0x921e9021F68b89220E4b6C326592Db64D4EF9d67',
      '0x1FfAB99DB981fBef755A4C7d2Ca4EE486c08C5Da',
      '0x9Cc1505E2319334BC195587BDd2d77d939246313',
    ]);
  });
});

describe('groupRequestsBySponsor', () => {
  it('groups all requests by sponsor', () => {
    const apiCalls = [
      fixtures.requests.buildApiCall({ sponsorAddress: '0x1d822613f7cC57Be9c9b6C3cC0Bf41b4FB4D97f9' }),
      fixtures.requests.buildApiCall({ sponsorAddress: '0x921e9021F68b89220E4b6C326592Db64D4EF9d67' }),
      fixtures.requests.buildApiCall({ sponsorAddress: '0x921e9021F68b89220E4b6C326592Db64D4EF9d67' }),
      fixtures.requests.buildApiCall({ sponsorAddress: '0x1FfAB99DB981fBef755A4C7d2Ca4EE486c08C5Da' }),
    ];
    const withdrawals = [
      fixtures.requests.buildWithdrawal({ sponsorAddress: '0x921e9021F68b89220E4b6C326592Db64D4EF9d67' }),
      fixtures.requests.buildWithdrawal({ sponsorAddress: '0x9Cc1505E2319334BC195587BDd2d77d939246313' }),
    ];
    const requests: GroupedRequests = {
      apiCalls: apiCalls,
      withdrawals: withdrawals,
    };

    const res = grouping.groupRequestsBySponsorAddress(requests);
    expect(res).toEqual({
      ['0x1d822613f7cC57Be9c9b6C3cC0Bf41b4FB4D97f9']: {
        apiCalls: [apiCalls[0]],
        withdrawals: [],
      },
      ['0x921e9021F68b89220E4b6C326592Db64D4EF9d67']: {
        apiCalls: [apiCalls[1], apiCalls[2]],
        withdrawals: [withdrawals[0]],
      },
      ['0x1FfAB99DB981fBef755A4C7d2Ca4EE486c08C5Da']: {
        apiCalls: [apiCalls[3]],
        withdrawals: [],
      },
      ['0x9Cc1505E2319334BC195587BDd2d77d939246313']: {
        apiCalls: [],
        withdrawals: [withdrawals[1]],
      },
    });
  });
});
