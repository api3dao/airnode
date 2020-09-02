import { removeKey } from '../utils/object-utils';
import * as sorting from './sorting';
import {
  ApiCall,
  BaseRequest,
  ClientRequest,
  GroupedRequests,
  ProviderState,
  RequestStatus,
  WalletDesignation,
  Withdrawal,
} from '../../types';

enum RequestType {
  ApiCall,
  WalletDesignation,
  Withdrawal,
}

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
    nextNonce: transactionCount + 1,
    requests: [],
  };

  const withNonces = flatRequests.reduce((acc, request, index) => {
    if (acc.assignmentBlocked) {
      return { ...acc, requests: [...acc.requests, request] };
    }

    if (request.status === RequestStatus.Blocked) {
      // If the request is blocked and roughly 2+ minutes have passed,
      // then ignore the request so as to not block subsequent
      // requests indefinitely.
      const maxBlockNumber = request.logMetadata.blockNumber + 20;
      const assignmentBlocked = currentBlock > maxBlockNumber;

      return {
        ...acc,
        assignmentBlocked,
        requests: [...acc.requests, request],
      };
    }

    const nonce = transactionCount + Number(index) + 1;
    const withNonce = { ...request, nonce: nonce };
    return {
      ...acc,
      requests: [...acc.requests, withNonce],
      nextNonce: nonce + 1,
    };
  }, initialState);

  return withNonces.requests;
}

export function assign(state: ProviderState) {
  const sortedWalletDataByIndex = sorting.sortRequestsByWalletIndex(state.walletDataByIndex);

  const walletIndices = Object.keys(state.walletDataByIndex);
  const walletDataByIndexWithNonces = walletIndices.reduce((acc, index) => {
    const walletData = sortedWalletDataByIndex[index];

    const flatRequests = flattenRequests(walletData.requests);

    const withNonces = assignWalletNonces(flatRequests, walletData.transactionCount, state.currentBlock!);

    const groupedRequestsWithNonces = groupRequests(withNonces);
    const updatedWalletData = { ...walletData, requests: groupedRequestsWithNonces };
    return { ...acc, [index]: updatedWalletData };
  }, {});

  return walletDataByIndexWithNonces;
}
