import * as logger from '../../../utils/logger';
import * as events from '../events';
import * as model from '../../../requests/api-calls/model';
import { ApiCall, BaseRequest, LogWithMetadata, ProviderState, RequestStatus } from '../../../../types';

function updateFulfilledRequests(
  state: ProviderState,
  apiCalls: BaseRequest<ApiCall>[],
  fulfillmentLogs: LogWithMetadata[]
): BaseRequest<ApiCall>[] {
  const fulfilledRequestIds = fulfillmentLogs.map((fl) => fl.parsedLog.args.requestId);

  return apiCalls.map((apiCall) => {
    if (fulfilledRequestIds.includes(apiCall.id)) {
      logger.logProviderJSON(state.config.name, 'DEBUG', `Request ID:${apiCall.id} has already been fulfilled`);
      return { ...apiCall, status: RequestStatus.Fulfilled };
    }

    return apiCall;
  });
}

export function mapBaseRequests(state: ProviderState, logsWithMetadata: LogWithMetadata[]): BaseRequest<ApiCall>[] {
  // Separate the logs
  const requestLogs = logsWithMetadata.filter((log) => events.isApiCallRequest(log.parsedLog));
  const fulfillmentLogs = logsWithMetadata.filter((log) => events.isApiCallFulfillment(log.parsedLog));

  // Cast raw logs to typed API request objects
  const apiCallBaseRequests = requestLogs.map((log) => model.initialize(log));

  // Decode and apply parameters for each API call
  const apiCallsWithParameters = apiCallBaseRequests.map((request) => model.applyParameters(state, request));

  // Update the status of requests that have already been fulfilled
  const apiCallsWithUpdatedStatus = updateFulfilledRequests(state, apiCallsWithParameters, fulfillmentLogs);

  return apiCallsWithUpdatedStatus;
}
