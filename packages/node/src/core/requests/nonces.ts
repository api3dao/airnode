import { removeKey } from '../utils/object-utils';
import * as sorting from '../requests/sorting';
import {
  ApiCall,
  BaseRequest,
  ClientRequest,
  GroupedRequests,
  ProviderState,
  RequestStatus,
  RequestType,
  WalletDesignation,
  Withdrawal,
} from '../../types';

type AnyRequest = ApiCall | WalletDesignation | Withdrawal;

function flattenRequests(groupedRequests: GroupedRequests): BaseRequest<any>[] {
  // Store the type as well temporarily so that requests can be ungrouped again
  const apiCalls = groupedRequests.apiCalls.map((apiCall) => ({ ...apiCall, type: RequestType.ApiCall }));

  const walletDesignations = groupedRequests.walletDesignations.map((designation) => ({
    ...designation,
    type: RequestType.WalletDesignation,
  }));

  const withdrawals = groupedRequests.withdrawals.map((withdrawal) => ({
    ...withdrawal,
    type: RequestType.Withdrawal,
  }));

  // Requests are processed with the following priority:
  //   1. API calls
  //   2. Withdrawals
  //   3. Wallet designations
  return [...apiCalls, ...withdrawals, ...walletDesignations];
}

function groupRequests(flatRequests: BaseRequest<any>[]): GroupedRequests {
  const apiCalls = flatRequests
    .filter((request) => request.type === RequestType.ApiCall)
    .map((request) => removeKey(request, 'type')) as ClientRequest<ApiCall>[];

  const walletDesignations = flatRequests
    .filter((request) => request.type === RequestType.WalletDesignation)
    .map((request) => removeKey(request, 'type')) as BaseRequest<WalletDesignation>[];

  const withdrawals = flatRequests
    .filter((request) => request.type === RequestType.Withdrawal)
    .map((request) => removeKey(request, 'type')) as ClientRequest<Withdrawal>[];

  return { apiCalls, walletDesignations, withdrawals };
}

function assignWalletNonces(
  flatRequests: BaseRequest<AnyRequest>[],
  transactionCount: number,
  currentBlock: number
): BaseRequest<any>[] {
  const initialState = {
    assignmentBlocked: false,
    nextNonce: transactionCount,
    requests: [],
  };

  const withNonces = flatRequests.reduce((acc, request) => {
    // If a previous request has been blocked, then the requests after
    // it should not be assigned a nonce
    if (acc.assignmentBlocked) {
      return { ...acc, requests: [...acc.requests, request] };
    }

    if (request.status === RequestStatus.Blocked) {
      // If the request is blocked and roughly 2+ minutes have passed,
      // then ignore the request so as to not block subsequent
      // requests indefinitely.
      const maxBlockNumber = request.logMetadata.blockNumber + 20;
      const assignmentBlocked = maxBlockNumber > currentBlock;

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

export function assign(state: ProviderState) {
  // Ensure requests are sorted for we assign nonces
  const sortedWalletDataByIndex = sorting.sortRequestsByWalletIndex(state.walletDataByIndex);

  const walletIndices = Object.keys(sortedWalletDataByIndex);
  const walletDataByIndexWithNonces = walletIndices.reduce((acc, index) => {
    const walletData = sortedWalletDataByIndex[index];

    // Flatten all requests into a single array so that nonces can be assigned across types
    const flatRequests = flattenRequests(walletData.requests);

    // Assign nonces to each request
    const flattenRequestsWithNonces = assignWalletNonces(
      flatRequests,
      walletData.transactionCount,
      state.currentBlock!
    );

    // Re-group requests so they can be added back to the state
    const groupedRequestsWithNonces = groupRequests(flattenRequestsWithNonces);
    const updatedWalletData = { ...walletData, requests: groupedRequestsWithNonces };
    return { ...acc, [index]: updatedWalletData };
  }, {});

  return walletDataByIndexWithNonces;
}
