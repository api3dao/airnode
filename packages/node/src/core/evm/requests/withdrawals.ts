import * as events from './events';
import * as logger from '../../logger';
import { BaseRequest, LogsData, LogWithMetadata, RequestStatus, Withdrawal } from '../../../types';

export function initialize(logWithMetadata: LogWithMetadata): BaseRequest<Withdrawal> {
  const { parsedLog } = logWithMetadata;

  const request: BaseRequest<Withdrawal> = {
    id: parsedLog.args.withdrawalRequestId,
    status: RequestStatus.Pending,
    providerId: parsedLog.args.providerId,
    requesterId: parsedLog.args.requesterId,
    destinationAddress: parsedLog.args.destination,
    metadata: {
      blockNumber: logWithMetadata.blockNumber,
      transactionHash: logWithMetadata.transactionHash,
    },
  };

  return request;
}

export function updateFulfilledRequests(
  withdrawals: BaseRequest<Withdrawal>[],
  fulfillmentLogs: LogWithMetadata[]
): LogsData<BaseRequest<Withdrawal>[]> {
  const fulfilledRequestIds = fulfillmentLogs.map((fl) => fl.parsedLog.args.withdrawRequestId);

  const { logs, requests } = withdrawals.reduce(
    (acc, withdrawal) => {
      if (fulfilledRequestIds.includes(withdrawal.id)) {
        const log = logger.pend('DEBUG', `WithdrawalRequest ID:${withdrawal.id} has already been fulfilled`);
        const fulfilledWithdrawal = { ...withdrawal, status: RequestStatus.Fulfilled };

        return {
          ...acc,
          logs: [...acc.logs, log],
          request: [...acc.requests, fulfilledWithdrawal],
        };
      }

      return acc;
    },
    { logs: [], requests: [] }
  );

  return [logs, requests];
}

export function mapBaseRequests(logsWithMetadata: LogWithMetadata[]): LogsData<BaseRequest<Withdrawal>[]> {
  // Separate the logs
  const requestLogs = logsWithMetadata.filter((log) => events.isWithdrawalRequest(log.parsedLog));
  const fulfillmentLogs = logsWithMetadata.filter((log) => events.isWithdrawalFulfillment(log.parsedLog));

  // Cast raw logs to typed WithdrawalRequest objects
  const withdrawalRequests = requestLogs.map((log) => initialize(log));

  // Update the status of requests that have already been fulfilled
  const [fulfilledLogs, fulfilledWithdrawals] = updateFulfilledRequests(withdrawalRequests, fulfillmentLogs);

  return [fulfilledLogs, fulfilledWithdrawals];
}
