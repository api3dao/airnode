import range from 'lodash/range';
import * as blocking from './blocking';
import * as fixtures from '../../../test/fixtures';
import { GroupedRequests } from '../../types';

const buildApiCallsWithSponsor = (count: number, sponsorAddress: string) =>
  range(count).map((i) => fixtures.requests.buildApiCall({ sponsorAddress, id: `id-${sponsorAddress}-${i}` }));

describe('blockRequestsWithWithdrawals', () => {
  it('drops API calls with pending withdrawals from the same sponsor', () => {
    const apiCall = buildApiCallsWithSponsor(1, '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181')[0];
    const withdrawal = fixtures.requests.buildWithdrawal({
      sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
    });
    const requests: GroupedRequests = {
      apiCalls: [apiCall],
      withdrawals: [withdrawal],
    };
    const [logs, res] = blocking.blockRequestsWithWithdrawals([[], requests]);
    expect(logs).toEqual([
      {
        level: 'WARN',
        message: `Dropping Request ID:${apiCall.id} as it has a pending Withdrawal ID:${withdrawal.id}`,
      },
    ]);
    expect(res.apiCalls.length).toEqual(0);
    expect(res.withdrawals.length).toEqual(1);
  });

  it('does nothing if API call and withdrawal wallet indices do not match', () => {
    const apiCall = buildApiCallsWithSponsor(1, '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181')[0];
    const withdrawal = fixtures.requests.buildWithdrawal({
      sponsorAddress: '0x99bd3a5A045066F1CEf37A0A952DFa87Af9D898E',
    });
    const requests: GroupedRequests = {
      apiCalls: [apiCall],
      withdrawals: [withdrawal],
    };
    const [logs, res] = blocking.blockRequestsWithWithdrawals([[], requests]);
    expect(logs).toEqual([]);
    expect(res.apiCalls.length).toEqual(1);
    expect(res.apiCalls[0].id).toEqual(apiCall.id);
    expect(res.withdrawals.length).toEqual(1);
    expect(res.withdrawals[0].id).toEqual(withdrawal.id);
  });
});
