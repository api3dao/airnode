import isEmpty from 'lodash/isEmpty';
import { ClientRequest, GroupedRequests, RequestStatus } from '../../types';

export function hasNoRequests(requests: GroupedRequests): boolean {
  return Object.keys(requests).every((requestType) => {
    return isEmpty(requests[requestType]);
  });
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
