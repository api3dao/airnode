import flatMap from 'lodash/flatMap';
import * as events from '../events';
import * as model from '../../../requests/api-calls/model';
import * as logger from '../../../utils/logger';
import { ApiCall, BaseRequest, LogWithMetadata, ProviderState } from '../../../../types';

export function mapBaseRequests(state: ProviderState, logsWithMetadata: LogWithMetadata[]): BaseRequest<ApiCall>[] {
  // Separate the logs
  const requestLogs = logsWithMetadata.filter((log) => events.isApiCallRequest(log.parsedLog));
  const fulfillmentLogs = logsWithMetadata.filter((log) => events.isApiCallFulfillment(log.parsedLog));

  // Cast raw logs to typed API request objects
  const apiCallBaseRequests = requestLogs.map((log) => model.initialize(log));

  // Decode and apply parameters for each API call
  const parameterized = apiCallBaseRequests.map((request) => model.applyParameters(request));
  // const parameterLogs = flatMap(parameterized, p => p[0]);
  const parameterizedRequests = flatMap(parameterized, (p) => p[1]);

  // Update the status of requests that have already been fulfilled
  const fulfilledRequestIds = fulfillmentLogs.map((fl) => fl.parsedLog.args.requestId);
  const [fulfilledLogs, fulfilledRequests] = model.updateFulfilledRequests(parameterizedRequests, fulfilledRequestIds);
  logger.logPendingMessages(state.config.name, fulfilledLogs);

  return fulfilledRequests;
}
