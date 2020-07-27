import { ethers } from 'ethers';
import { ProviderState, WithdrawalRequest } from '../../../../types';
import * as logger from '../../../utils/logger';
import * as events from '../events';
import * as model from './model';

// Alias types
type Log = ethers.utils.LogDescription;

function discardFulfilledRequests(state: ProviderState, requestLogs: Log[], fulfillmentLogs: Log[]): Log[] {
  const fulfilledRequestIds = fulfillmentLogs.map((fl) => fl.args.withdrawRequestId);

  return requestLogs.reduce((acc, requestLog) => {
    const { withdrawRequestId } = requestLog.args;
    if (fulfilledRequestIds.includes(withdrawRequestId)) {
      logger.logProviderJSON(
        state.config.name,
        'DEBUG',
        `WithdrawalRequest ID:${withdrawRequestId} has already been fulfilled`
      );
      return acc;
    }
    return [...acc, requestLog];
  }, []);
}

export function mapPending(state: ProviderState, logs: Log[]): WithdrawalRequest[] {
  // Separate the logs
  const requestLogs = logs.filter((log) => events.isWithdrawalEvent(log));
  const fulfillmentLogs = logs.filter((log) => events.isWithdrawalFulfillmentEvent(log));

  // We don't care about request events that have already been fulfilled
  const unfulfilledRequestLogs = discardFulfilledRequests(state, requestLogs, fulfillmentLogs);

  // Cast raw logs to typed WithdrawalRequest objects
  const withdrawalRequests = unfulfilledRequestLogs.map((rl) => model.initialize(rl));

  return withdrawalRequests;
}
