import flatMap from 'lodash/flatMap';
import isNil from 'lodash/isNil';
import * as logger from '../../logger';
import { ApiCall, AuthorizationByRequestId, Request, LogsData, RequestErrorMessage, RequestStatus } from '../../types';

function applyAuthorization(
  apiCall: Request<ApiCall>,
  authorizationByRequestId: AuthorizationByRequestId
): LogsData<Request<ApiCall>> {
  // Don't overwrite any existing error codes or statuses
  if (apiCall.errorMessage || apiCall.status !== RequestStatus.Pending) {
    return [[], apiCall];
  }

  // There should always be an endpointId at this point, but just in case, check again
  // and drop the request if it is missing. If endpointId is missing, it means that the
  // template was not loaded
  if (!apiCall.endpointId) {
    const log = logger.pend('ERROR', `No endpoint ID found for Request ID:${apiCall.id}`);
    const updatedApiCall: Request<ApiCall> = {
      ...apiCall,
      status: RequestStatus.Blocked,
      errorMessage: RequestErrorMessage.TemplateNotFound, // TODO: shouldn't this be UnknownEndpointId?
    };
    return [[log], updatedApiCall];
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
    return [[log], updatedApiCall];
  }

  if (authorized) {
    return [[], apiCall];
  }

  const log = logger.pend(
    'WARN',
    `Requester:${apiCall.requesterAddress} is not authorized to access Endpoint ID:${apiCall.endpointId} for Request ID:${apiCall.id}`
  );
  // If the request is unauthorized, update the status of the request
  const updatedApiCall: Request<ApiCall> = {
    ...apiCall,
    status: RequestStatus.Errored,
    errorMessage: `${RequestErrorMessage.Unauthorized}: ${apiCall.requesterAddress}`,
  };
  return [[log], updatedApiCall];
}

export function mergeAuthorizations(
  apiCalls: Request<ApiCall>[],
  authorizationByRequestId: AuthorizationByRequestId
): LogsData<Request<ApiCall>[]> {
  const logsWithApiCalls = apiCalls.map((apiCall) => {
    return applyAuthorization(apiCall, authorizationByRequestId);
  });

  const logs = flatMap(logsWithApiCalls, (a) => a[0]);
  const authorizedApiCalls = flatMap(logsWithApiCalls, (a) => a[1]);
  return [logs, authorizedApiCalls];
}
