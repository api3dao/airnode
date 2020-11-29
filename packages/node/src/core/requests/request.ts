import isEmpty from 'lodash/isEmpty';
import { ApiCall, ClientRequest, GroupedRequests, RequestStatus, Withdrawal } from '../../types';

export function blockedOrIgnored<T>(request: ClientRequest<T>): RequestStatus.Blocked | RequestStatus.Ignored {
  const { blockNumber, currentBlock, ignoreBlockedRequestsAfterBlocks } = request.metadata;
  return currentBlock - blockNumber > ignoreBlockedRequestsAfterBlocks ? RequestStatus.Ignored : RequestStatus.Blocked;
}

export function filterActionableApiCalls(apiCalls: ClientRequest<ApiCall>[]): ClientRequest<ApiCall>[] {
  return apiCalls.filter((a) => a.status === RequestStatus.Pending || a.status === RequestStatus.Errored);
}

export function filterActionableWithdrawals(withdrawals: ClientRequest<Withdrawal>[]): ClientRequest<Withdrawal>[] {
  return withdrawals.filter((w) => w.status === RequestStatus.Pending);
}

export function hasActionableApiCalls(apiCalls: ClientRequest<ApiCall>[]): boolean {
  const actionableApiCalls = filterActionableApiCalls(apiCalls);
  return !isEmpty(actionableApiCalls);
}

export function hasActionableWithdrawals(withdrawals: ClientRequest<Withdrawal>[]): boolean {
  const actionableWithdrawals = filterActionableWithdrawals(withdrawals);
  return !isEmpty(actionableWithdrawals);
}

export function hasNoActionableRequests(groupedRequests: GroupedRequests): boolean {
  const noApiCalls = !hasActionableApiCalls(groupedRequests.apiCalls);
  const noWithdrawals = !hasActionableWithdrawals(groupedRequests.withdrawals);
  return noApiCalls && noWithdrawals;
}

export function getStatusNames() {
  return Object.keys(RequestStatus).filter((s) => !(parseInt(s) >= 0));
}

export function getErrorCode<T>(request: ClientRequest<T>): number {
  // IMPORTANT: A status code of "0" indicates that there were no errors.
  // Returning anything other than "0" will result in error handlers
  // being triggered in the relevant contracts when submitting transactions.
  return request.errorCode || 0;
}
