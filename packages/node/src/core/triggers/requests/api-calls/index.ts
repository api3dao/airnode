import { ethers } from 'ethers';
import { ProviderState } from '../../../../types';
import * as logger from '../../../utils/logger';
import * as events from '../events';
import * as model from './model';
import * as requesterDetails from './requester-details';

// Alias types
type NewApiCallRequest = model.NewApiCallRequest;
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

export async function mapPending(state: ProviderState, logs: Log[]): Promise<NewApiCallRequest[]> {
  const requestLogs = logs.filter((log) => events.isApiCallEvent(log));
  const fulfillmentLogs = logs.filter((log) => events.isApiCallFulfillmentEvent(log));

  // We don't care about request events that have already been fulfilled
  const unfulfilledRequestLogs = discardFulfilledRequests(state, requestLogs, fulfillmentLogs);

  // Cast raw logs to typed API request objects
  const newApiCallRequests = unfulfilledRequestLogs.map((log) => model.initialize(state, log));

  // Fetch extra details for each unique requester
  const requesterData = await requesterDetails.fetch(state, newApiCallRequests);

  const apiCallRequests = requesterDetails.apply(newApiCallRequests, requesterData);

  return apiCallRequests;
}
