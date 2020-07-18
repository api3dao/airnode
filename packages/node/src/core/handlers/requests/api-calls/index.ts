import { ethers } from 'ethers';
import { ApiCallRequest, ProviderState } from '../../../../types';
import * as events from '../events';
import * as apiCall from './api-call';
import * as logger from '../../../utils/logger';

// Shortening the type
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

export function mapPendingRequests(state: ProviderState, logs: Log[]): ApiCallRequest[] {
  const requestLogs = logs.filter((log) => events.isApiCallEvent(log));
  const fulfillmentLogs = logs.filter((log) => events.isApiCallEvent(log));

  // We don't care about request events that have already been fulfilled
  const unfulfilledRequestLogs = discardFulfilledRequests(state, requestLogs, fulfillmentLogs);

  // Cast raw logs to typed API request objects
  const apiCallRequests = unfulfilledRequestLogs.map((log) => apiCall.initialize(state, log));
  return apiCallRequests;
}
