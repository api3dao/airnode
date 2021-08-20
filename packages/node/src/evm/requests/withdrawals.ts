import * as events from './events';
import * as logger from '../../logger';
import {
  ClientRequest,
  EVMEventLog,
  EVMFulfilledWithdrawalLog,
  EVMRequestedWithdrawalLog,
  LogsData,
  RequestStatus,
  Withdrawal,
  PendingLog,
} from '../../types';

export function initialize(logWithMetadata: EVMRequestedWithdrawalLog): ClientRequest<Withdrawal> {
  const { parsedLog } = logWithMetadata;

  const request: ClientRequest<Withdrawal> = {
    airnodeAddress: parsedLog.args.airnode,
    designatedWallet: parsedLog.args.designatedWallet,
    destinationAddress: parsedLog.args.destination,
    id: parsedLog.args.withdrawalRequestId,
    metadata: {
      blockNumber: logWithMetadata.blockNumber,
      currentBlock: logWithMetadata.currentBlock,
      ignoreBlockedRequestsAfterBlocks: logWithMetadata.ignoreBlockedRequestsAfterBlocks,
      transactionHash: logWithMetadata.transactionHash,
    },
    requesterIndex: parsedLog.args.requesterIndex.toString(),
    status: RequestStatus.Pending,
  };

  return request;
}

export interface UpdatedFulfilledRequests {
  readonly logs: PendingLog[];
  readonly requests: ClientRequest<Withdrawal>[];
}

export function updateFulfilledRequests(
  withdrawals: ClientRequest<Withdrawal>[],
  fulfilledRequestIds: string[]
): LogsData<ClientRequest<Withdrawal>[]> {
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

export function mapRequests(logsWithMetadata: EVMEventLog[]): LogsData<ClientRequest<Withdrawal>[]> {
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
