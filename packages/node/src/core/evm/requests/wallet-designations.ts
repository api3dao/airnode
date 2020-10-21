import * as events from './events';
import * as logger from '../../logger';
import { BaseRequest, LogsData, LogWithMetadata, RequestStatus, WalletDesignation } from '../../../types';

export function initialize(logWithMetadata: LogWithMetadata): BaseRequest<WalletDesignation> {
  const { parsedLog } = logWithMetadata;

  const request: BaseRequest<WalletDesignation> = {
    id: parsedLog.args.walletDesignationRequestId,
    status: RequestStatus.Pending,
    depositAmount: parsedLog.args.depositAmount.toString(),
    providerId: parsedLog.args.providerId,
    requesterId: parsedLog.args.requesterId,
    walletIndex: parsedLog.args.walletInd.toString(),
    metadata: {
      blockNumber: logWithMetadata.blockNumber,
      transactionHash: logWithMetadata.transactionHash,
    },
  };

  return request;
}

export function updateFulfilledRequests(
  walletDesignations: BaseRequest<WalletDesignation>[],
  fulfillmentLogs: LogWithMetadata[]
): LogsData<BaseRequest<WalletDesignation>[]> {
  const fulfilledRequestIds = fulfillmentLogs.map((fl) => fl.parsedLog.args.walletDesignationRequestId);

  const initialState = {
    logs: [],
    requests: [],
  };

  const fulfilledDesignations = walletDesignations.reduce((acc, walletDesignation) => {
    if (fulfilledRequestIds.includes(walletDesignation.id)) {
      const log = logger.pend(
        'DEBUG',
        `Wallet designation Request ID:${walletDesignation.id} has already been fulfilled`
      );
      const fulfilledDesignation = { ...walletDesignation, status: RequestStatus.Fulfilled };

      return {
        ...acc,
        logs: [...acc.logs, log],
        requests: [...acc.requests, fulfilledDesignation],
      };
    }

    return { ...acc, requests: [...acc.requests, walletDesignation] };
  }, initialState);

  return [fulfilledDesignations.logs, fulfilledDesignations.requests];
}

export function filterDuplicateRequests(
  walletDesignations: BaseRequest<WalletDesignation>[]
): LogsData<BaseRequest<WalletDesignation>[]> {
  const initialState = {
    logs: [],
    requestsById: {},
  };

  const uniqueRequests = walletDesignations.reduce((acc, walletDesignation) => {
    // If there is already a WalletDesignation request with the given ID, ignore the current one
    const duplicateLog = acc.requestsById[walletDesignation.id];

    if (duplicateLog) {
      const log = logger.pend(
        'INFO',
        `Ignored duplicate request for wallet designation Request ID:${walletDesignation.id}`
      );
      return { ...acc, logs: [...acc.logs, log] };
    }

    return {
      ...acc,
      requestsById: { ...acc.requestsById, [walletDesignation.id]: walletDesignation },
    };
  }, initialState);

  const flatRequests = Object.values(uniqueRequests.requestsById) as BaseRequest<WalletDesignation>[];
  return [uniqueRequests.logs, flatRequests];
}

export function mapBaseRequests(logsWithMetadata: LogWithMetadata[]): LogsData<BaseRequest<WalletDesignation>[]> {
  // Separate the logs
  const requestLogs = logsWithMetadata.filter((log) => events.isWalletDesignationRequest(log.parsedLog));
  const fulfillmentLogs = logsWithMetadata.filter((log) => events.isWalletDesignationFulfillment(log.parsedLog));

  // Cast raw logs to typed WalletDesignation objects
  const walletDesignationRequests = requestLogs.map((log) => initialize(log));

  // Update the status of requests that have already been fulfilled
  const [fulfilledLogs, fulfilledRequests] = updateFulfilledRequests(walletDesignationRequests, fulfillmentLogs);

  // The user is able to rebroadcast the event, so we need to filter out duplicate requests
  const [uniqueLogs, uniqueRequests] = filterDuplicateRequests(fulfilledRequests);

  const logs = [...fulfilledLogs, ...uniqueLogs];
  return [logs, uniqueRequests];
}
