import { ethers } from 'ethers';
import { ApiCall, ProviderState, RegularRequest } from '../../../../types';
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

export function mapPending(state: ProviderState, logs: Log[]): RegularRequest<ApiCall>[] {
  // Separate the logs
  const requestLogs = logs.filter((log) => events.isApiCallEvent(log));
  const fulfillmentLogs = logs.filter((log) => events.isApiCallFulfillmentEvent(log));

  // We don't care about request events that have already been fulfilled
  const unfulfilledRequestLogs = discardFulfilledRequests(state, requestLogs, fulfillmentLogs);

  // Cast raw logs to typed API request objects
  const apiCallRequests = unfulfilledRequestLogs.map((log) => model.initialize(state, log));

  return apiCallRequests;
}

export function mapRequesterAddresses(requests: RegularRequest<ApiCall>[]): string[] {
  // Calls for requests that are already invalid are wasted
  const validRequests = requests.filter((r) => r.valid);

  return validRequests.map((r) => r.requesterAddress);
}
