import range from 'lodash/range';
import * as blocking from './blocking';
import * as fixtures from '../../../test/fixtures';
import { GroupedRequests, RequestStatus } from '../../types';
import { MAXIMUM_SPONSOR_WALLET_REQUESTS } from '../../constants';

const buildApiCallsWithSponsor = (count: number, sponsorAddress: string) =>
  range(count).map((i) => fixtures.requests.buildApiCall({ sponsorAddress, id: `id-${sponsorAddress}-${i}` }));

describe('dropRequestsWithWithdrawals', () => {
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
    expect(res.withdrawals[0].status).toEqual(RequestStatus.Pending);
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
    expect(res.apiCalls[0].status).toEqual(RequestStatus.Pending);
    expect(res.withdrawals.length).toEqual(1);
    expect(res.withdrawals[0].id).toEqual(withdrawal.id);
    expect(res.withdrawals[0].status).toEqual(RequestStatus.Pending);
  });

  it('does not block API calls linked to non-pending withdrawals', () => {
    const sponsorAddress = '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181';
    const apiCall = fixtures.requests.buildApiCall({ sponsorAddress });
    const statuses = Object.keys(RequestStatus).filter(
      (status) => RequestStatus[status as RequestStatus] !== RequestStatus.Pending
    );
    const withdrawals = statuses.map((status) => {
      return fixtures.requests.buildWithdrawal({
        status: RequestStatus[status as RequestStatus],
        sponsorAddress,
      });
    });
    const requests: GroupedRequests = {
      apiCalls: [apiCall],
      withdrawals,
    };
    const [logs, res] = blocking.blockRequestsWithWithdrawals([[], requests]);
    expect(logs).toEqual([]);
    expect(res.apiCalls.length).toEqual(1);
    expect(res.apiCalls[0].status).toEqual(RequestStatus.Pending);
  });
});

describe('applySponsorAndSponsorWalletRequestLimit', () => {
  it('ensures a request limit on requests per sponsor and sponsor wallet pair', () => {
    const sponsorAddresses = [
      '0xab296574a9FB30d11d06B3b50cFd2a85E4b203b6',
      '0x719BFe83fc029420B6eDd4e0D3F4E1000E5ce0f9',
      '0x26B3dA8C6B45b1e917a7670C8E091D032f31538E',
    ];
    const apiCalls = [
      ...buildApiCallsWithSponsor(9, sponsorAddresses[0]),
      ...buildApiCallsWithSponsor(6, sponsorAddresses[1]),
      ...buildApiCallsWithSponsor(4, sponsorAddresses[2]),
    ];
    // Change the sponsor wallet for first two requests
    (apiCalls[0] as any).sponsorWalletAddress = '0xCff5E39025c27dE44CE7900bCe9eeaA85b73a5eD';
    (apiCalls[1] as any).sponsorWalletAddress = '0xCff5E39025c27dE44CE7900bCe9eeaA85b73a5eD';
    const requests: GroupedRequests = {
      apiCalls: apiCalls,
      withdrawals: [],
    };

    const [logs, res] = blocking.applySponsorAndSponsorWalletRequestLimit([[], requests]);

    expect(logs).toHaveLength(3);
    expect(logs).toEqual([
      {
        level: 'WARN',
        message:
          'Blocking Request ID:id-0xab296574a9FB30d11d06B3b50cFd2a85E4b203b6-7 as it exceeded sponsor request limit.',
      },
      {
        level: 'WARN',
        message:
          'Blocking Request ID:id-0xab296574a9FB30d11d06B3b50cFd2a85E4b203b6-8 as it exceeded sponsor request limit.',
      },
      {
        level: 'WARN',
        message:
          'Blocking Request ID:id-0x719BFe83fc029420B6eDd4e0D3F4E1000E5ce0f9-5 as it exceeded sponsor request limit.',
      },
    ]);
    expect(res.apiCalls.length).toEqual(19);
    expect(
      res.apiCalls.filter((apiCall) => apiCall.sponsorAddress === sponsorAddresses[0] && !apiCall.errorMessage)
      // +2 because we changed the sponsorWallet for the first two requests
    ).toHaveLength(MAXIMUM_SPONSOR_WALLET_REQUESTS + 2);
    expect(
      res.apiCalls.filter((apiCall) => apiCall.sponsorAddress === sponsorAddresses[1] && !apiCall.errorMessage)
    ).toHaveLength(MAXIMUM_SPONSOR_WALLET_REQUESTS);
    expect(res.withdrawals).toEqual([]);
  });
});

describe('blockRequests', () => {
  it('applies all blocking conditions to api requests', () => {
    const sponsorAddresses = [
      '0xab296574a9FB30d11d06B3b50cFd2a85E4b203b6',
      '0x719BFe83fc029420B6eDd4e0D3F4E1000E5ce0f9',
      '0x26B3dA8C6B45b1e917a7670C8E091D032f31538E',
    ];
    const apiCalls = [
      ...buildApiCallsWithSponsor(7, sponsorAddresses[0]),
      ...buildApiCallsWithSponsor(6, sponsorAddresses[1]),
      ...buildApiCallsWithSponsor(4, sponsorAddresses[2]),
    ];
    const withdrawals = [
      fixtures.requests.buildWithdrawal({
        sponsorAddress: sponsorAddresses[1],
      }),
    ];
    const requests: GroupedRequests = {
      apiCalls: apiCalls,
      withdrawals: withdrawals,
    };

    const [logs, res] = blocking.blockRequests(requests);

    expect(logs).toHaveLength(8);
    expect(logs).toEqual([
      {
        level: 'WARN',
        message:
          'Dropping Request ID:id-0x719BFe83fc029420B6eDd4e0D3F4E1000E5ce0f9-0 as it has a pending Withdrawal ID:withdrawalId',
      },
      {
        level: 'WARN',
        message:
          'Dropping Request ID:id-0x719BFe83fc029420B6eDd4e0D3F4E1000E5ce0f9-1 as it has a pending Withdrawal ID:withdrawalId',
      },
      {
        level: 'WARN',
        message:
          'Dropping Request ID:id-0x719BFe83fc029420B6eDd4e0D3F4E1000E5ce0f9-2 as it has a pending Withdrawal ID:withdrawalId',
      },
      {
        level: 'WARN',
        message:
          'Dropping Request ID:id-0x719BFe83fc029420B6eDd4e0D3F4E1000E5ce0f9-3 as it has a pending Withdrawal ID:withdrawalId',
      },
      {
        level: 'WARN',
        message:
          'Dropping Request ID:id-0x719BFe83fc029420B6eDd4e0D3F4E1000E5ce0f9-4 as it has a pending Withdrawal ID:withdrawalId',
      },
      {
        level: 'WARN',
        message:
          'Dropping Request ID:id-0x719BFe83fc029420B6eDd4e0D3F4E1000E5ce0f9-5 as it has a pending Withdrawal ID:withdrawalId',
      },
      {
        level: 'WARN',
        message:
          'Blocking Request ID:id-0xab296574a9FB30d11d06B3b50cFd2a85E4b203b6-5 as it exceeded sponsor request limit.',
      },
      {
        level: 'WARN',
        message:
          'Blocking Request ID:id-0xab296574a9FB30d11d06B3b50cFd2a85E4b203b6-6 as it exceeded sponsor request limit.',
      },
    ]);
    expect(res.apiCalls.length).toEqual(11);
    expect(
      res.apiCalls.filter((apiCall) => apiCall.sponsorAddress === sponsorAddresses[0] && !apiCall.errorMessage)
    ).toHaveLength(MAXIMUM_SPONSOR_WALLET_REQUESTS);
    expect(res.apiCalls.filter((apiCall) => apiCall.sponsorAddress === sponsorAddresses[1])).toHaveLength(0);
    expect(res.apiCalls.filter((apiCall) => apiCall.sponsorAddress === sponsorAddresses[2])).toHaveLength(4);
    expect(res.withdrawals.length).toEqual(1);
  });
});
