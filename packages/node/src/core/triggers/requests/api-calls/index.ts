import { ethers } from 'ethers';
import { ApiCallRequest, ProviderState } from '../../../../types';
import * as logger from '../../../utils/logger';
import * as events from '../events';
import * as model from './model';
import * as requesterDetails from './requester-data';

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

function discardUnprocessableRequests(state: ProviderState, requests: ApiCallRequest[]): ApiCallRequest[] {
  return requests.reduce((acc, request) => {
    if (request.valid || !request.errorCode) {
      return [...acc, request];
    }

    if (model.UNPROCESSABLE_ERROR_CODES.includes(request.errorCode)) {
      const message = `Request ID:${request.requestId} has unprocessable error code:${request.errorCode}`;
      logger.logProviderJSON(state.config.name, 'DEBUG', message);
    }

    return [...acc, request];
  }, []);
}

export async function mapPending(state: ProviderState, logs: Log[]): Promise<ApiCallRequest[]> {
  // Separate the logs
  const requestLogs = logs.filter((log) => events.isApiCallEvent(log));
  const fulfillmentLogs = logs.filter((log) => events.isApiCallFulfillmentEvent(log));

  // We don't care about request events that have already been fulfilled
  const unfulfilledRequestLogs = discardFulfilledRequests(state, requestLogs, fulfillmentLogs);

  // Cast raw logs to typed API request objects
  const apiCallRequests = unfulfilledRequestLogs.map((log) => model.initialize(state, log));

  return apiCallRequests;
}
