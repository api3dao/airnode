import * as logger from '../../../utils/logger';
import * as events from '../events';
import * as model from '../../../requests/api-calls/model';
import { ApiCall, BaseRequest, LogWithMetadata, ProviderState } from '../../../../types';

function discardFulfilledRequests(
  state: ProviderState,
  requestLogs: LogWithMetadata[],
  fulfillmentLogs: LogWithMetadata[]
): LogWithMetadata[] {
  const fulfilledRequestIds = fulfillmentLogs.map((fl) => fl.parsedLog.args.requestId);

  return requestLogs.reduce((acc, requestLog) => {
    const { requestId } = requestLog.parsedLog.args;

    if (fulfilledRequestIds.includes(requestId)) {
      logger.logProviderJSON(state.config.name, 'DEBUG', `Request ID:${requestId} has already been fulfilled`);
      return acc;
    }

    return [...acc, requestLog];
  }, []);
}

export function mapBaseRequests(state: ProviderState, logsWithMetadata: LogWithMetadata[]): BaseRequest<ApiCall>[] {
  // Separate the logs
  const requestLogs = logsWithMetadata.filter((log) => events.isApiCallRequest(log.parsedLog));
  const fulfillmentLogs = logsWithMetadata.filter((log) => events.isApiCallFulfillment(log.parsedLog));

  // We don't care about request events that have already been fulfilled
  const unfulfilledRequestLogs = discardFulfilledRequests(state, requestLogs, fulfillmentLogs);

  // Cast raw logs to typed API request objects
  const apiCallBaseRequests = unfulfilledRequestLogs.map((log) => model.initialize(log));
  const apiCallsWithParameters = apiCallBaseRequests.map((request) => model.applyParameters(state, request));

  return apiCallsWithParameters;
}
