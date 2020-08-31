import * as logger from '../../../utils/logger';
import * as events from '../events';
import * as model from '../../../requests/wallet-designations/model';
import { BaseRequest, LogWithMetadata, ProviderState, RequestStatus, WalletDesignation } from '../../../../types';

type UniqueRequests = { [id: string]: BaseRequest<WalletDesignation> };

function updateFulfilledRequests(
  state: ProviderState,
  walletDesignations: BaseRequest<WalletDesignation>[],
  fulfillmentLogs: LogWithMetadata[]
): BaseRequest<WalletDesignation>[] {
  const fulfilledRequestIds = fulfillmentLogs.map((fl) => fl.parsedLog.args.walletDesignationRequestId);

  return walletDesignations.map((walletDesignation) => {
    if (fulfilledRequestIds.includes(walletDesignation.id)) {
      logger.logProviderJSON(
        state.config.name,
        'DEBUG',
        `WalletDesignation ID:${walletDesignation.id} has already been fulfilled`
      );
      return { ...walletDesignation, status: RequestStatus.Fulfilled };
    }

    return walletDesignation;
  });
}

function filterDuplicateRequests(state: ProviderState, walletDesignations: BaseRequest<WalletDesignation>[]): BaseRequest<WalletDesignation>[] {
  const initialState: UniqueRequests = {};

  const requestsById = walletDesignations.reduce((acc, walletDesignation) => {
    // If there is already a WalletDesignation request with the given ID, ignore the current one
    const duplicateLog = acc[walletDesignation.id];

    if (duplicateLog) {
      logger.logProviderJSON(
        state.config.name,
        'DEBUG',
        `Duplicate request for WalletDesignation ID:${walletDesignation.id} ignored`
      );
      return acc;
    }

    return { ...acc, [walletDesignation.id]: walletDesignation };
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

  // Cast raw logs to typed WalletDesignation objects
  const walletDesignationRequests = requestLogs.map((rl) => model.initialize(rl));

  // Update the status of requests that have already been fulfilled
  const designationsWithUpdatedStatus = updateFulfilledRequests(state, walletDesignationRequests, fulfillmentLogs);

  // The user is able to rebroadcast the event, so we need to filter out duplicate requests
  const uniqueWalletDesignations = filterDuplicateRequests(state, designationsWithUpdatedStatus);

  return uniqueWalletDesignations;
}
