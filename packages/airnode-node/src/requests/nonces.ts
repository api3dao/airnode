import * as grouping from './grouping';
import { blockedOrIgnored } from './request';
import * as sorting from './sorting';
import { AnyRequest, GroupedRequests, ProviderState, Request, RequestStatus, EVMProviderSponsorState } from '../types';

interface AssignedNonces {
  readonly assignmentBlocked: boolean;
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
    // If a previous request has been blocked, then the requests after
    // it should not be assigned a nonce
    if (acc.assignmentBlocked) {
      return { ...acc, requests: [...acc.requests, request] };
    }

    if (request.status === RequestStatus.Fulfilled) {
      return { ...acc, requests: [...acc.requests, request] };
    }

    if (request.status === RequestStatus.Blocked) {
      const status = blockedOrIgnored(request);
      const assignmentBlocked = status === RequestStatus.Blocked;

      return {
        ...acc,
        assignmentBlocked,
        requests: [...acc.requests, request],
      };
    }

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
