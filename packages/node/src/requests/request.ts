import isEmpty from 'lodash/isEmpty';
import { ApiCall, Request, GroupedRequests, RequestStatus, Withdrawal } from '../types';

export function blockedOrIgnored<T>(request: Request<T>): RequestStatus.Blocked | RequestStatus.Ignored {
  const { blockNumber, currentBlock, ignoreBlockedRequestsAfterBlocks } = request.metadata;
  return currentBlock - blockNumber > ignoreBlockedRequestsAfterBlocks ? RequestStatus.Ignored : RequestStatus.Blocked;
}

export function filterActionableApiCalls(apiCalls: Request<ApiCall>[]): Request<ApiCall>[] {
  return apiCalls.filter((a) => a.status === RequestStatus.Pending || a.status === RequestStatus.Errored);
}

export function filterActionableWithdrawals(withdrawals: Request<Withdrawal>[]): Request<Withdrawal>[] {
  return withdrawals.filter((w) => w.status === RequestStatus.Pending);
}

export function hasActionableApiCalls(apiCalls: Request<ApiCall>[]): boolean {
  const actionableApiCalls = filterActionableApiCalls(apiCalls);
  return !isEmpty(actionableApiCalls);
}

export function hasActionableWithdrawals(withdrawals: Request<Withdrawal>[]): boolean {
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

export function getErrorCode<T>(request: Request<T>): number {
  // IMPORTANT: A status code of "0" indicates that there were no errors.
  // Returning anything other than "0" will result in error handlers
  // being triggered in the relevant contracts when submitting transactions.
  return request.errorCode || 0;
}
