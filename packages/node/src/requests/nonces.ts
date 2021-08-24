import * as grouping from './grouping';
import { blockedOrIgnored } from './request';
import * as sorting from './sorting';
import { removeKey } from '../utils/object-utils';
import {
  ApiCall,
  ClientRequest,
  EVMProviderState,
  GroupedRequests,
  ProviderState,
  RequestStatus,
  RequestType,
  Withdrawal,
} from '../types';

type AnyRequest = ApiCall | Withdrawal;

interface AssignedNonces {
  readonly assignmentBlocked: boolean;
  readonly nextNonce: number;
  readonly requests: ClientRequest<AnyRequest>[];
}

function flattenRequests(groupedRequests: GroupedRequests): ClientRequest<AnyRequest>[] {
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

function groupRequests(flatRequests: ClientRequest<any>[]): GroupedRequests {
  const apiCalls = flatRequests
    .filter((request) => request.__type === RequestType.ApiCall)
    .map((request) => removeKey(request, '__type')) as ClientRequest<ApiCall>[];

  const withdrawals = flatRequests
    .filter((request) => request.__type === RequestType.Withdrawal)
    .map((request) => removeKey(request, '__type')) as ClientRequest<Withdrawal>[];

  return { apiCalls, withdrawals };
}

function assignWalletNonces(flatRequests: ClientRequest<AnyRequest>[], transactionCount: number): ClientRequest<any>[] {
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

export function assign(state: ProviderState<EVMProviderState>): GroupedRequests {
  const requestsBySponsorAddress = grouping.groupRequestsBySponsorAddress(state.requests);

  const sponsorAddresses = Object.keys(requestsBySponsorAddress);

  return sponsorAddresses.reduce(
    (acc: GroupedRequests, sponsorAddress) => {
      const requests = requestsBySponsorAddress[sponsorAddress];

      // Ensure requests are sorted for we assign nonces
      const sortedRequests = sorting.sortGroupedRequests(requests);

      // Flatten all requests into a single array so that nonces can be assigned across types
      const flatRequests = flattenRequests(sortedRequests);

      const transactionCount = state.transactionCountsBySponsorAddress[sponsorAddress];

      // Assign nonces to each request
      const flattenRequestsWithNonces = assignWalletNonces(flatRequests, transactionCount);

      // Re-group requests so they can be added back to the state
      const { apiCalls, withdrawals } = groupRequests(flattenRequestsWithNonces);

      return {
        ...acc,
        apiCalls: [...acc.apiCalls, ...apiCalls],
        withdrawals: [...acc.withdrawals, ...withdrawals],
      };
    },
    { apiCalls: [], withdrawals: [] }
  );
}
