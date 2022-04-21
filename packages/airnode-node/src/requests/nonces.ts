import * as grouping from './grouping';
import * as sorting from './sorting';
import { AnyRequest, GroupedRequests, ProviderState, Request, EVMProviderSponsorState } from '../types';

interface AssignedNonces {
  readonly nextNonce: number;
  readonly requests: Request<AnyRequest>[];
}

function assignWalletNonces(flatRequests: Request<AnyRequest>[], transactionCount: number): Request<any>[] {
  const initialState = {
    assignmentBlocked: false,
    nextNonce: transactionCount,
    requests: [],
  };

  const withNonces = flatRequests.reduce((acc: AssignedNonces, request) => {
    const requestWithNonce = { ...request, nonce: acc.nextNonce };
    return {
      ...acc,
      requests: [...acc.requests, requestWithNonce],
      nextNonce: acc.nextNonce + 1,
    };
  }, initialState);

  return withNonces.requests;
}

export function assign(state: ProviderState<EVMProviderSponsorState>): GroupedRequests {
  // Ensure requests are sorted before assigning nonces
  const sortedRequests = sorting.sortGroupedRequests(state.requests);
  // Flatten all requests into a single array so that nonces can be assigned across types
  const flatRequests = grouping.flattenRequests(sortedRequests);
  const transactionCount = state.transactionCountsBySponsorAddress[state.sponsorAddress];
  // Assign nonces to each request
  const flattenRequestsWithNonces = assignWalletNonces(flatRequests, transactionCount);

  return grouping.groupRequests(flattenRequestsWithNonces);
}
