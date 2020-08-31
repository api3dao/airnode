import * as logger from '../../../utils/logger';
import * as events from '../events';
import * as model from '../../../requests/withdrawals/model';
import { BaseRequest, LogWithMetadata, ProviderState, RequestStatus, Withdrawal } from '../../../../types';

function updateFulfilledRequests(
  state: ProviderState,
  withdrawals: BaseRequest<Withdrawal>[],
  fulfillmentLogs: LogWithMetadata[]
): BaseRequest<Withdrawal>[] {
  const fulfilledRequestIds = fulfillmentLogs.map((fl) => fl.parsedLog.args.withdrawRequestId);

  return withdrawals.map((withdrawal) => {
    if (fulfilledRequestIds.includes(withdrawal.id)) {
      logger.logProviderJSON(
        state.config.name,
        'DEBUG',
        `WithdrawalRequest ID:${withdrawal.id} has already been fulfilled`
      );
      return { ...withdrawal, status: RequestStatus.Fulfilled };
    }

    return withdrawal;
  });
}

export function mapBaseRequests(state: ProviderState, logsWithMetadata: LogWithMetadata[]): BaseRequest<Withdrawal>[] {
  // Separate the logs
  const requestLogs = logsWithMetadata.filter((log) => events.isWithdrawalRequest(log.parsedLog));
  const fulfillmentLogs = logsWithMetadata.filter((log) => events.isWithdrawalFulfillment(log.parsedLog));

  // Cast raw logs to typed WithdrawalRequest objects
  const withdrawalRequests = requestLogs.map((rl) => model.initialize(rl));

  // Update the status of requests that have already been fulfilled
  const withdrawalsWithUpdatedStatus = updateFulfilledRequests(state, withdrawalRequests, fulfillmentLogs);

  return withdrawalsWithUpdatedStatus;
}
