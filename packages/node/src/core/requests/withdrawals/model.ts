import { BaseRequest, LogWithMetadata, PendingLog, RequestStatus, Withdrawal } from '../../../types';

type LogsAndRequests = [PendingLog[], BaseRequest<Withdrawal>[]];

export function initialize(logWithMetadata: LogWithMetadata): BaseRequest<Withdrawal> {
  const { parsedLog } = logWithMetadata;

  const request: BaseRequest<Withdrawal> = {
    id: parsedLog.args.withdrawalRequestId,
    status: RequestStatus.Pending,
    providerId: parsedLog.args.providerId,
    requesterId: parsedLog.args.requesterId,
    destinationAddress: parsedLog.args.destination,
    logMetadata: {
      blockNumber: logWithMetadata.blockNumber,
      transactionHash: logWithMetadata.transactionHash,
    },
  };

  return request;
}

export function updateFulfilledRequests(
  withdrawals: BaseRequest<Withdrawal>[],
  fulfillmentLogs: LogWithMetadata[]
): LogsAndRequests {
  const fulfilledRequestIds = fulfillmentLogs.map((fl) => fl.parsedLog.args.withdrawRequestId);

  const initialState = {
    logs: [],
    requests: [],
  };

  const fulfilledWithdrawals = withdrawals.reduce((acc, withdrawal) => {
    if (fulfilledRequestIds.includes(withdrawal.id)) {
      const log: PendingLog = {
        level: 'DEBUG',
        message: `WithdrawalRequest ID:${withdrawal.id} has already been fulfilled`,
      };

      const fulfilledWithdrawal = { ...withdrawal, status: RequestStatus.Fulfilled };

      return {
        ...acc,
        logs: [...acc.logs, log],
        request: [...acc.requests, fulfilledWithdrawal],
      };
    }

    return acc;
  }, initialState);

  return [fulfilledWithdrawals.logs, fulfilledWithdrawals.requests];
}
