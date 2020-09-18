import get from 'lodash/get';
import flatMap from 'lodash/flatMap';
import isNil from 'lodash/isNil';
import * as logger from '../../utils/logger';
import {
  ApiCall,
  AuthorizationByEndpointId,
  ClientRequest,
  LogsErrorData,
  RequestErrorCode,
  RequestStatus,
  WalletDataByIndex,
} from '../../../types';

function mapApiCalls(
  apiCalls: ClientRequest<ApiCall>[],
  authorizationsByEndpointId: AuthorizationByEndpointId
): LogsErrorData<ClientRequest<ApiCall>[]> {
  const logsWithApiCalls: LogsErrorData<ClientRequest<ApiCall>>[] = apiCalls.map((apiCall) => {
    // Don't overwrite any existing error codes or statuses
    if (apiCall.errorCode || apiCall.status !== RequestStatus.Pending) {
      return [[], null, apiCall];
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
      return [[log], null, updatedApiCall];
    }

    const isRequestedAuthorized = get(authorizationsByEndpointId, [apiCall.endpointId, apiCall.requesterAddress]);

    // If we couldn't fetch the authorization status, block the request until the next run
    if (isNil(isRequestedAuthorized)) {
      const log = logger.pend('WARN', `Authorization not found for Request ID:${apiCall.id}`);
      const updatedApiCall = {
        ...apiCall,
        status: RequestStatus.Blocked,
        errorCode: RequestErrorCode.AuthorizationNotFound,
      };
      return [[log], null, updatedApiCall];
    }

    if (isRequestedAuthorized) {
      return [[], null, apiCall];
    }

    const log = logger.pend(
      'WARN',
      `Client:${apiCall.requesterAddress} is not authorized to access Endpoint ID:${apiCall.endpointId} for Request ID:${apiCall.id}`
    );
    const updatedApiCall = {
      ...apiCall,
      status: RequestStatus.Errored,
      errorCode: RequestErrorCode.UnauthorizedClient,
    };
    return [[log], null, updatedApiCall];
  });

  const logs = flatMap(logsWithApiCalls, (a) => a[0]);
  const updatedApiCalls = flatMap(logsWithApiCalls, (a) => a[2]);

  return [logs, null, updatedApiCalls];
}

export function mergeAuthorizations(
  walletDataByIndex: WalletDataByIndex,
  authorizationsByEndpointId: AuthorizationByEndpointId
): LogsErrorData<WalletDataByIndex> {
  const walletIndices = Object.keys(walletDataByIndex);

  const updatedWalletDataWithLogs = walletIndices.reduce(
    (acc, index) => {
      const walletData = walletDataByIndex[index];
      const { requests } = walletData;

      // Update the authorization status of each API call
      const [mapApiCallLogs, _mapApiCallErr, apiCalls] = mapApiCalls(requests.apiCalls, authorizationsByEndpointId);

      const updatedLogs = [...acc.logs, ...mapApiCallLogs];

      const updatedWalletData = { ...walletData, requests: { ...requests, apiCalls } };
      const updatedWalletDataByIndex = {
        ...acc.walletDataByIndex,
        [index]: updatedWalletData,
      };

      return { logs: updatedLogs, walletDataByIndex: updatedWalletDataByIndex };
    },
    { logs: [], walletDataByIndex: {} }
  );

  return [updatedWalletDataWithLogs.logs, null, updatedWalletDataWithLogs.walletDataByIndex];
}
