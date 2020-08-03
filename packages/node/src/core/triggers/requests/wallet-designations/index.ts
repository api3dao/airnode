import { ethers } from 'ethers';
import { BaseRequest, ProviderState, WalletDesignation } from '../../../../types';
import * as logger from '../../../utils/logger';
import * as events from '../events';
import * as model from './model';

// Alias type
type Log = ethers.utils.LogDescription;

type UniqueRequests = { [id: string]: Log };

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

function discardDuplicateRequests(state: ProviderState, requestLogs: Log[]) {
  const initialState: UniqueRequests = {};

  const requestsById = requestLogs.reduce((acc, requestLog) => {
    const { walletDesignationRequestId } = requestLog.args;

    // If there is already a WalletDesignation request with the given ID, ignore the current one
    const duplicateLog = acc[walletDesignationRequestId];

    if (duplicateLog) {
      logger.logProviderJSON(
        state.config.name,
        'DEBUG',
        `Duplicate request for WalletDesignation ID:${walletDesignationRequestId} ignored`
      );
      return acc;
    }
    return { ...acc, [walletDesignationRequestId]: requestLog };
  }, initialState);

  return Object.values(requestsById);
}

export function mapBaseRequests(state: ProviderState, logs: Log[]): BaseRequest<WalletDesignation>[] {
  // Separate the logs
  const requestLogs = logs.filter((log) => events.isWalletDesignationRequest(log));
  const fulfillmentLogs = logs.filter((log) => events.isWalletDesignationFulfillment(log));

  // We don't care about request events that have already been fulfilled
  const unfulfilledRequestLogs = discardFulfilledRequests(state, requestLogs, fulfillmentLogs);
  const uniqueRequestLogs = discardDuplicateRequests(state, unfulfilledRequestLogs);

  // Cast raw logs to typed WalletDesignation objects
  const walletDesignationRequests = uniqueRequestLogs.map((rl) => model.initialize(rl));

  return walletDesignationRequests;
}
