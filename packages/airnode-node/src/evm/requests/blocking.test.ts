import range from 'lodash/range';
import * as blocking from './blocking';
import * as fixtures from '../../../test/fixtures';
import { GroupedRequests } from '../../types';

const buildApiCallsWithSponsor = (count: number, sponsorAddress: string) =>
  range(count).map((i) => fixtures.requests.buildApiCall({ sponsorAddress, id: `id-${sponsorAddress}-${i}` }));

describe('blockRequests', () => {
  it('does not block any requests', () => {
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

    expect(logs).toEqual([]);
    expect(res.apiCalls.length).toEqual(17);
    expect(res.apiCalls.filter((apiCall) => apiCall.sponsorAddress === sponsorAddresses[0])).toHaveLength(7);
    expect(res.apiCalls.filter((apiCall) => apiCall.sponsorAddress === sponsorAddresses[1])).toHaveLength(6);
    expect(res.apiCalls.filter((apiCall) => apiCall.sponsorAddress === sponsorAddresses[2])).toHaveLength(4);
    expect(res.withdrawals.length).toEqual(1);
  });
});
