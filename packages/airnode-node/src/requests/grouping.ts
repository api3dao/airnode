import groupBy from 'lodash/groupBy';
import uniq from 'lodash/uniq';
import { removeKey } from '@api3/airnode-utilities';
import { AnyRequest, ApiCall, GroupedRequests, Request, RequestType, Withdrawal } from '../types';

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
  }, {} as RequestsBySponsorAddress);

  return groupedRequests;
}

export function flattenRequests(groupedRequests: GroupedRequests): Request<AnyRequest>[] {
  // Store the type as well temporarily so that requests can be ungrouped again
  const apiCalls = groupedRequests.apiCalls.map((apiCall) => ({ ...apiCall, __type: RequestType.ApiCall }));

  const withdrawals = groupedRequests.withdrawals.map((withdrawal) => ({
    ...withdrawal,
    __type: RequestType.Withdrawal,
  }));

  // Requests are processed with the following priority:
  //   1. API calls
  //   2. Withdrawals
  return [...apiCalls, ...withdrawals];
}

export function groupRequests(flatRequests: Request<any>[]): GroupedRequests {
  const apiCalls = flatRequests
    .filter((request) => request.__type === RequestType.ApiCall)
    .map((request) => removeKey(request, '__type')) as Request<ApiCall>[];

  const withdrawals = flatRequests
    .filter((request) => request.__type === RequestType.Withdrawal)
    .map((request) => removeKey(request, '__type')) as Request<Withdrawal>[];

  return { apiCalls, withdrawals };
}
