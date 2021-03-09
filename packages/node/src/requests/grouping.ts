import groupBy from 'lodash/groupBy';
import uniq from 'lodash/uniq';
import { GroupedRequests } from '../types';

export interface RequestsByRequesterIndex {
  [requesterIndex: string]: GroupedRequests;
}

export function mapUniqueRequesterIndices(requests: GroupedRequests): string[] {
  const apiCallIndices = requests.apiCalls.map((r) => r.requesterIndex!);
  const withdrawalIndices = requests.withdrawals.map((r) => r.requesterIndex!);
  return uniq([...apiCallIndices, ...withdrawalIndices]);
}

export function groupRequestsByRequesterIndex(requests: GroupedRequests): RequestsByRequesterIndex {
  const apiCalls = requests.apiCalls.filter((a) => !!a.requesterIndex);
  const withdrawals = requests.withdrawals.filter((w) => !!w.requesterIndex);

  const apiCallsByRequesterIndex = groupBy(apiCalls, 'requesterIndex');
  const withdrawalsByRequesterIndex = groupBy(withdrawals, 'requesterIndex');

  const uniqueRequesterIndices = mapUniqueRequesterIndices(requests);

  const groupedRequests = uniqueRequesterIndices.reduce((acc, requesterIndex) => {
    const requests = {
      apiCalls: apiCallsByRequesterIndex[requesterIndex!] || [],
      withdrawals: withdrawalsByRequesterIndex[requesterIndex!] || [],
    };

    return { ...acc, [requesterIndex!]: requests };
  }, {});

  return groupedRequests;
}
