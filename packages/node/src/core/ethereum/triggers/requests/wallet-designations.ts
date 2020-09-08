import * as logger from 'src/core/utils/logger';
import * as model from 'src/core/requests/wallet-designations/model';
import * as events from './events';
import { BaseRequest, LogWithMetadata, PendingLog, ProviderState, RequestStatus, WalletDesignation } from 'src/types';

type LogsAndRequests = [PendingLog[], BaseRequest<WalletDesignation>[]];

export function updateFulfilledRequests(
  walletDesignations: BaseRequest<WalletDesignation>[],
  fulfillmentLogs: LogWithMetadata[]
): LogsAndRequests {
  const fulfilledRequestIds = fulfillmentLogs.map((fl) => fl.parsedLog.args.walletDesignationRequestId);

  const initialState = {
    logs: [],
    requests: [],
  };

  const fulfilledDesignations = walletDesignations.reduce((acc, walletDesignation) => {
    if (fulfilledRequestIds.includes(walletDesignation.id)) {
      const log: PendingLog = {
        level: 'DEBUG',
        message: `WalletDesignation ID:${walletDesignation.id} has already been fulfilled`,
      };

      const fulfilledDesignation = { ...walletDesignation, status: RequestStatus.Fulfilled };

      return {
        ...acc,
        logs: [...acc.logs, log],
        request: [...acc.requests, fulfilledDesignation],
      };
    }

    return acc;
  }, initialState);

  return [fulfilledDesignations.logs, fulfilledDesignations.requests];
}

export function filterDuplicateRequests(walletDesignations: BaseRequest<WalletDesignation>[]): LogsAndRequests {
  const initialState = {
    logs: [],
    requestsById: {},
  };

  const uniqueRequests = walletDesignations.reduce((acc, walletDesignation) => {
    // If there is already a WalletDesignation request with the given ID, ignore the current one
    const duplicateLog = acc[walletDesignation.id];

    if (duplicateLog) {
      const log: PendingLog = {
        level: 'INFO',
        message: `Ignored duplicate request for WalletDesignation ID:${walletDesignation.id}`,
      };

      return { ...acc, logs: [...acc.logs, log] };
    }

    return { ...acc, requests: { ...acc.requestsById, [walletDesignation.id]: walletDesignation } };
  }, initialState);

  const flatRequests = Object.values(uniqueRequests.requestsById) as BaseRequest<WalletDesignation>[];
  return [uniqueRequests.logs, flatRequests];
}

export function mapBaseRequests(
  state: ProviderState,
  logsWithMetadata: LogWithMetadata[]
): BaseRequest<WalletDesignation>[] {
  // Separate the logs
  const requestLogs = logsWithMetadata.filter((log) => events.isWalletDesignationRequest(log.parsedLog));
  const fulfillmentLogs = logsWithMetadata.filter((log) => events.isWalletDesignationFulfillment(log.parsedLog));

  // Cast raw logs to typed WalletDesignation objects
  const walletDesignationRequests = requestLogs.map((rl) => model.initialize(rl));

  // Update the status of requests that have already been fulfilled
  const [fulfilledLogs, fulfilledRequests] = updateFulfilledRequests(walletDesignationRequests, fulfillmentLogs);
  logger.logPendingMessages(state.config.name, fulfilledLogs);

  // The user is able to rebroadcast the event, so we need to filter out duplicate requests
  const [duplicateLogs, uniqueRequests] = filterDuplicateRequests(fulfilledRequests);
  logger.logPendingMessages(state.config.name, duplicateLogs);

  return uniqueRequests;
}
