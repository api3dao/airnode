import { ethers } from 'ethers';
import { ApiCall, BaseRequest, ProviderState } from '../../../../types';
import * as logger from '../../../utils/logger';
import * as events from '../events';
import * as model from './model';

// Alias types
type Log = ethers.utils.LogDescription;

function discardFulfilledRequests(state: ProviderState, requestLogs: Log[], fulfillmentLogs: Log[]): Log[] {
  const fulfilledRequestIds = fulfillmentLogs.map((fl) => fl.args.requestId);

  return requestLogs.reduce((acc, requestLog) => {
    const { requestId } = requestLog.args;
    if (fulfilledRequestIds.includes(requestId)) {
      logger.logProviderJSON(state.config.name, 'DEBUG', `Request ID:${requestId} has already been fulfilled`);
      return acc;
    }
    return [...acc, requestLog];
  }, []);
}

export function mapBaseRequests(state: ProviderState, logs: Log[]): BaseRequest<ApiCall>[] {
  // Separate the logs
  const requestLogs = logs.filter((log) => events.isApiCallRequest(log));
  const fulfillmentLogs = logs.filter((log) => events.isApiCallFulfillment(log));

  // We don't care about request events that have already been fulfilled
  const unfulfilledRequestLogs = discardFulfilledRequests(state, requestLogs, fulfillmentLogs);

  // Cast raw logs to typed API request objects
  const apiCallRequests = unfulfilledRequestLogs.map((log) => model.initialize(state, log));

  return apiCallRequests;
}
