import isNil from 'lodash/isNil';
import { logger } from '@api3/airnode-utilities';
import {
  ApiCall,
  AuthorizationByRequestId,
  Request,
  LogsData,
  RequestErrorMessage,
  RequestStatus,
  UpdatedRequests,
} from '../../types';

function applyAuthorization(
  apiCalls: Request<ApiCall>[],
  authorizationByRequestId: AuthorizationByRequestId
): LogsData<Request<ApiCall>[]> {
  const { logs, requests } = apiCalls.reduce(
    (acc, apiCall) => {
      // Don't overwrite any existing error codes or statuses
      if (apiCall.errorMessage || apiCall.status !== RequestStatus.Pending) {
        return { ...acc, requests: [...acc.requests, apiCall] };
      }

      // There should always be an endpointId at this point, but just in case, check again
      // and drop the request if it is missing. If endpointId is missing, it means that the
      // template was not loaded
      if (!apiCall.endpointId) {
        const log = logger.pend('ERROR', `No endpoint ID found for Request ID:${apiCall.id}`);
        return { ...acc, logs: [...acc.logs, log] };
      }

      const authorized = authorizationByRequestId[apiCall.id];

      // If we couldn't fetch the authorization status, block the request until the next run
      if (isNil(authorized)) {
        const log = logger.pend('WARN', `Authorization not found for Request ID:${apiCall.id}`);
        const updatedApiCall: Request<ApiCall> = {
          ...apiCall,
          status: RequestStatus.Blocked,
          errorMessage: RequestErrorMessage.AuthorizationNotFound,
        };
        return { ...acc, logs: [...acc.logs, log], requests: [...acc.requests, updatedApiCall] };
      }

      if (authorized) {
        return { ...acc, requests: [...acc.requests, apiCall] };
      }

      // If the request is unauthorized, update drop the request
      const log = logger.pend(
        'WARN',
        `Requester:${apiCall.requesterAddress} is not authorized to access Endpoint ID:${apiCall.endpointId} for Request ID:${apiCall.id}`
      );
      return { ...acc, logs: [...acc.logs, log] };
    },
    { logs: [], requests: [] } as UpdatedRequests<ApiCall>
  );
  return [logs, requests];
}

export function mergeAuthorizations(
  apiCalls: Request<ApiCall>[],
  authorizationByRequestId: AuthorizationByRequestId
): LogsData<Request<ApiCall>[]> {
  const [logs, authorizedApiCalls] = applyAuthorization(apiCalls, authorizationByRequestId);

  return [logs, authorizedApiCalls];
}
