import { ethers } from 'ethers';
import { BaseRequest, ProviderState, WalletDesignation } from '../../../../types';
import * as logger from '../../../utils/logger';
import * as events from '../events';
import * as model from './model';

// Alias types
type Log = ethers.utils.LogDescription;

function discardFulfilledRequests(state: ProviderState, requestLogs: Log[], fulfillmentLogs: Log[]): Log[] {
  const fulfilledRequestIds = fulfillmentLogs.map((fl) => fl.args.walletDesignationRequestId);

  return requestLogs.reduce((acc, requestLog) => {
    const { walletDesignationRequestId } = requestLog.args;
    if (fulfilledRequestIds.includes(walletDesignationRequestId)) {
      logger.logProviderJSON(
        state.config.name,
        'DEBUG',
        `WalletDesignation ID:${walletDesignationRequestId} has already been fulfilled`
      );
      return acc;
    }
    return [...acc, requestLog];
  }, []);
}

export function mapBaseRequests(state: ProviderState, logs: Log[]): BaseRequest<WalletDesignation>[] {
  // Separate the logs
  const requestLogs = logs.filter((log) => events.isWalletDesignationRequest(log));
  const fulfillmentLogs = logs.filter((log) => events.isWalletDesignationFulfillment(log));

  // We don't care about request events that have already been fulfilled
  const unfulfilledRequestLogs = discardFulfilledRequests(state, requestLogs, fulfillmentLogs);

  // Cast raw logs to typed WalletDesignation objects
  const walletDesignationRequests = unfulfilledRequestLogs.map((rl) => model.initialize(rl));

  return walletDesignationRequests;
}
