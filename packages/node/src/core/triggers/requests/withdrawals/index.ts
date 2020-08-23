import * as logger from '../../../utils/logger';
import * as events from '../events';
import * as model from '../../../requests/withdrawals/model';
import { BaseRequest, LogWithMetadata, ProviderState, Withdrawal } from '../../../../types';

function discardFulfilledRequests(state: ProviderState, requestLogs: LogWithMetadata[], fulfillmentLogs: LogWithMetadata[]): LogWithMetadata[] {
  const fulfilledRequestIds = fulfillmentLogs.map((fl) => fl.parsedLog.args.withdrawRequestId);

  return requestLogs.reduce((acc, requestLog) => {
    const { withdrawRequestId } = requestLog.parsedLog.args;

    if (fulfilledRequestIds.includes(withdrawRequestId)) {
      logger.logProviderJSON(
        state.config.name,
        'DEBUG',
        `WithdrawalRequest ID:${withdrawRequestId} has already been fulfilled`
      );
      return acc;
    }

    return [...acc, requestLog];
  }, []);
}

export function mapBaseRequests(state: ProviderState, logsWithMetadata: LogWithMetadata[]): BaseRequest<Withdrawal>[] {
  // Separate the logs
  const requestLogs = logsWithMetadata.filter((log) => events.isWithdrawalRequest(log.parsedLog));
  const fulfillmentLogs = logsWithMetadata.filter((log) => events.isWithdrawalFulfillment(log.parsedLog));

  // We don't care about request events that have already been fulfilled
  const unfulfilledRequestLogs = discardFulfilledRequests(state, requestLogs, fulfillmentLogs);

  // Cast raw logs to typed WithdrawalRequest objects
  const withdrawalRequests = unfulfilledRequestLogs.map((rl) => model.initialize(rl));

  return withdrawalRequests;
}
