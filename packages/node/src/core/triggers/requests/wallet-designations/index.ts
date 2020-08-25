import * as logger from '../../../utils/logger';
import * as events from '../events';
import * as model from '../../../requests/wallet-designations/model';
import { BaseRequest, LogWithMetadata, ProviderState, WalletDesignation } from '../../../../types';

type UniqueRequests = { [id: string]: LogWithMetadata };

function discardFulfilledRequests(
  state: ProviderState,
  requestLogs: LogWithMetadata[],
  fulfillmentLogs: LogWithMetadata[]
): LogWithMetadata[] {
  const fulfilledRequestIds = fulfillmentLogs.map((fl) => fl.parsedLog.args.walletDesignationRequestId);

  return requestLogs.reduce((acc, requestLog) => {
    const { walletDesignationRequestId } = requestLog.parsedLog.args;

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

function discardDuplicateRequests(state: ProviderState, requestLogs: LogWithMetadata[]): LogWithMetadata[] {
  const initialState: UniqueRequests = {};

  const requestsById = requestLogs.reduce((acc, requestLog) => {
    const { walletDesignationRequestId } = requestLog.parsedLog.args;

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

export function mapBaseRequests(
  state: ProviderState,
  logsWithMetadata: LogWithMetadata[]
): BaseRequest<WalletDesignation>[] {
  // Separate the logs
  const requestLogs = logsWithMetadata.filter((log) => events.isWalletDesignationRequest(log.parsedLog));
  const fulfillmentLogs = logsWithMetadata.filter((log) => events.isWalletDesignationFulfillment(log.parsedLog));

  // We don't care about request events that have already been fulfilled
  const unfulfilledRequestLogs = discardFulfilledRequests(state, requestLogs, fulfillmentLogs);

  // The user is able to rebroadcast the event, so we need to filter out duplicates
  const uniqueRequestLogs = discardDuplicateRequests(state, unfulfilledRequestLogs);

  // Cast raw logs to typed WalletDesignation objects
  const walletDesignationRequests = uniqueRequestLogs.map((rl) => model.initialize(rl));

  return walletDesignationRequests;
}
