import groupBy from 'lodash/groupBy';
import uniq from 'lodash/uniq';
import { GroupedRequests } from '../types';

export interface RequestsBySponsorAddress {
  readonly [sponsorAddress: string]: GroupedRequests;
}

export function mapUniqueSponsorAddresses(requests: GroupedRequests): string[] {
  const apiCallSponsorAddresses = requests.apiCalls.map((r) => r.sponsorAddress!);
  const withdrawalSponsorAddresses = requests.withdrawals.map((r) => r.sponsorAddress!);
  return uniq([...apiCallSponsorAddresses, ...withdrawalSponsorAddresses]);
}

export function groupRequestsBySponsorAddress(requests: GroupedRequests): RequestsBySponsorAddress {
  const apiCalls = requests.apiCalls.filter((a) => !!a.sponsorAddress);
  const withdrawals = requests.withdrawals.filter((w) => !!w.sponsorAddress);

  const apiCallsBySponsorAddress = groupBy(apiCalls, 'sponsorAddress');
  const withdrawalsBySponsorAddress = groupBy(withdrawals, 'sponsorAddress');

  const uniqueSponsorAddresses = mapUniqueSponsorAddresses(requests);

  const groupedRequests = uniqueSponsorAddresses.reduce((acc, sponsorAddress) => {
    const requests = {
      apiCalls: apiCallsBySponsorAddress[sponsorAddress!] || [],
      withdrawals: withdrawalsBySponsorAddress[sponsorAddress!] || [],
    };

    return { ...acc, [sponsorAddress]: requests };
  }, {});

  return groupedRequests;
}
