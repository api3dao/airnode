import * as logger from '../../utils/logger';
import { DirectRequest, GroupedProviderRequests, ProviderState, RequestErrorCode } from '../../../types';

// We can't process requests with these errors, so they are ignored
export const UNPROCESSABLE_ERROR_CODES = [RequestErrorCode.RequesterDataNotFound, RequestErrorCode.InsufficientBalance];

function discardRequests<T>(state: ProviderState, requests: DirectRequest<T>[]): DirectRequest<T>[] {
  return requests.reduce((acc, request) => {
    if (request.valid) {
      return [...acc, request];
    }

    if (request.errorCode && UNPROCESSABLE_ERROR_CODES.includes(request.errorCode)) {
      const message = `Discarding Request ID:${request.id} as it has unprocessable error code:${request.errorCode}`;
      logger.logProviderJSON(state.config.name, 'ERROR', message);
      return acc;
    }

    return [...acc, request];
  }, []);
}

export function discardUnprocessableRequests(
  state: ProviderState,
  requests: GroupedProviderRequests
): GroupedProviderRequests {
  const apiCalls = discardRequests(state, requests.apiCalls);

  return {
    apiCalls,
    // TODO:
    walletAuthorizations: [],
    withdrawals: [],
  };
}
