import { ClientRequest, RequestStatus } from '../../types';

export function getStatusNames() {
  return Object.keys(RequestStatus).filter((s) => !(parseInt(s) >= 0));
}

export function getErrorCode<T>(request: ClientRequest<T>): number {
  // IMPORTANT: A status code of "0" indicates that there were no errors.
  // Returning anything other than "0" will result in error handlers
  // being triggered in the relevant contracts when submitting transactions.
  return request.errorCode || 0;
}
