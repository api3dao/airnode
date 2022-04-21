import { Request, GroupedRequests } from '../types';

export function hasNoActionableRequests(groupedRequests: GroupedRequests): boolean {
  const noApiCalls = groupedRequests.apiCalls.length === 0;
  const noWithdrawals = groupedRequests.withdrawals.length === 0;
  return noApiCalls && noWithdrawals;
}

export function getErrorMessage<T>(request: Request<T>): string | undefined {
  // IMPORTANT: A status code of "0" indicates that there were no errors.
  // Returning anything other than "0" will result in error handlers
  // being triggered in the relevant contracts when submitting transactions.
  return request.errorMessage;
}
