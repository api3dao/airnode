import get from 'lodash/get';
import flatMap from 'lodash/flatMap';
import isNil from 'lodash/isNil';
import * as logger from '../../logger';
import {
  ApiCall,
  AuthorizationByEndpointId,
  ClientRequest,
  LogsData,
  RequestErrorCode,
  RequestStatus,
} from '../../../types';

function applyAuthorization(
  apiCall: ClientRequest<ApiCall>,
  authorizationsByEndpointId: AuthorizationByEndpointId
): LogsData<ClientRequest<ApiCall>> {
  // Don't overwrite any existing error codes or statuses
  if (apiCall.errorCode || apiCall.status !== RequestStatus.Pending) {
    return [[], apiCall];
  }

  // There should always be an endpointId at this point, but just in case, check again
  // and drop the request if it is missing. If endpointId is missing, it means that the
  // template was not loaded
  if (!apiCall.endpointId) {
    const log = logger.pend('ERROR', `No endpoint ID found for Request ID:${apiCall.id}`);
    const updatedApiCall = {
      ...apiCall,
      status: RequestStatus.Blocked,
      errorCode: RequestErrorCode.TemplateNotFound,
    };
    return [[log], updatedApiCall];
  }

  const isRequestedAuthorized = get(authorizationsByEndpointId, [apiCall.endpointId, apiCall.clientAddress]);

  // If we couldn't fetch the authorization status, block the request until the next run
  if (isNil(isRequestedAuthorized)) {
    const log = logger.pend('WARN', `Authorization not found for Request ID:${apiCall.id}`);
    const updatedApiCall = {
      ...apiCall,
      status: RequestStatus.Blocked,
      errorCode: RequestErrorCode.AuthorizationNotFound,
    };
    return [[log], updatedApiCall];
  }

  if (isRequestedAuthorized) {
    return [[], apiCall];
  }

  const log = logger.pend(
    'WARN',
    `Client:${apiCall.clientAddress} is not authorized to access Endpoint ID:${apiCall.endpointId} for Request ID:${apiCall.id}`
  );
  // If the request is unauthorized, update the status of the request
  const updatedApiCall = {
    ...apiCall,
    status: RequestStatus.Errored,
    errorCode: RequestErrorCode.UnauthorizedClient,
  };
  return [[log], updatedApiCall];
}

export function mergeAuthorizations(
  apiCalls: ClientRequest<ApiCall>[],
  authorizationsByEndpointId: AuthorizationByEndpointId
): LogsData<ClientRequest<ApiCall>[]> {
  const logsWithApiCalls = apiCalls.map((apiCall) => {
    return applyAuthorization(apiCall, authorizationsByEndpointId);
  });

  const logs = flatMap(logsWithApiCalls, (a) => a[0]);
  const authorizedApiCalls = flatMap(logsWithApiCalls, (a) => a[1]);
  return [logs, authorizedApiCalls];
}
