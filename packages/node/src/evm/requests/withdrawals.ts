import * as events from './events';
import * as logger from '../../logger';
import {
  Request,
  EVMEventLog,
  EVMFulfilledWithdrawalLog,
  EVMRequestedWithdrawalLog,
  LogsData,
  RequestStatus,
  Withdrawal,
  PendingLog,
} from '../../types';

export function initialize(logWithMetadata: EVMRequestedWithdrawalLog): Request<Withdrawal> {
  const { parsedLog } = logWithMetadata;

  const request: Request<Withdrawal> = {
    airnodeAddress: parsedLog.args.airnode,
    sponsorWallet: parsedLog.args.sponsorWallet,
    id: parsedLog.args.withdrawalRequestId,
    metadata: {
      blockNumber: logWithMetadata.blockNumber,
      currentBlock: logWithMetadata.currentBlock,
      ignoreBlockedRequestsAfterBlocks: logWithMetadata.ignoreBlockedRequestsAfterBlocks,
      transactionHash: logWithMetadata.transactionHash,
    },
    sponsorAddress: parsedLog.args.sponsor,
    status: RequestStatus.Pending,
  };

  return request;
}

export interface UpdatedFulfilledRequests {
  readonly logs: PendingLog[];
  readonly requests: Request<Withdrawal>[];
}

export function updateFulfilledRequests(
  withdrawals: Request<Withdrawal>[],
  fulfilledRequestIds: string[]
): LogsData<Request<Withdrawal>[]> {
  const { logs, requests } = withdrawals.reduce(
    (acc: UpdatedFulfilledRequests, withdrawal) => {
      if (fulfilledRequestIds.includes(withdrawal.id)) {
        const log = logger.pend('DEBUG', `Request ID:${withdrawal.id} (withdrawal) has already been fulfilled`);
        const fulfilledWithdrawal = { ...withdrawal, status: RequestStatus.Fulfilled };

        return {
          ...acc,
          logs: [...acc.logs, log],
          requests: [...acc.requests, fulfilledWithdrawal],
        };
      }

      return { ...acc, requests: [...acc.requests, withdrawal] };
    },
    { logs: [], requests: [] }
  );

  return [logs, requests];
}

export function mapRequests(logsWithMetadata: EVMEventLog[]): LogsData<Request<Withdrawal>[]> {
  // Separate the logs
  const requestLogs = logsWithMetadata.filter((log) => events.isWithdrawalRequest(log)) as EVMRequestedWithdrawalLog[];
  const fulfillmentLogs = logsWithMetadata.filter((log) =>
    events.isWithdrawalFulfillment(log)
  ) as EVMFulfilledWithdrawalLog[];

  // Cast raw logs to typed WithdrawalRequest objects
  const withdrawalRequests = requestLogs.map(initialize);

  // Update the status of requests that have already been fulfilled
  const fulfilledRequestIds = fulfillmentLogs.map((fl) => fl.parsedLog.args.withdrawalRequestId);
  const [fulfilledLogs, withdrawalsWithFulfillments] = updateFulfilledRequests(withdrawalRequests, fulfilledRequestIds);

  return [fulfilledLogs, withdrawalsWithFulfillments];
}
