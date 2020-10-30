import groupBy from 'lodash/groupBy';
import uniq from 'lodash/uniq';
import { GroupedRequests } from '../../types';

export interface RequestsByRequesterIndex {
  [requesterIndex: string]: GroupedRequests
}

export function groupRequestsByRequesterIndex(requests: GroupedRequests): RequestsByRequesterIndex {
  const apiCalls = requests.apiCalls.filter((a) => !!a.requesterIndex).map((a) => a.requesterIndex);
  const withdrawals = requests.withdrawals.filter((w) => !!w.requesterIndex).map((w) => w.requesterIndex);

  const uniqueRequesterIndices = uniq([...apiCalls, ...withdrawals]);

  const apiCallsByRequesterIndex = groupBy(apiCalls, 'requesterIndex');
  const withdrawalsByRequesterIndex = groupBy(withdrawals, 'requesterIndex');

  const groupedRequests = uniqueRequesterIndices.reduce((acc, requesterIndex) => {
    const requests = {
      apiCalls: apiCallsByRequesterIndex[requesterIndex!] || [],
      withdrawals: withdrawalsByRequesterIndex[requesterIndex!] || [],
    };

    return { ...acc, [requesterIndex!]: requests };
  }, {});

  return groupedRequests;
}
