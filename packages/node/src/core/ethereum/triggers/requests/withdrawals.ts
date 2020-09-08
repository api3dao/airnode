import * as logger from 'src/core/utils/logger';
import * as model from 'src/core/requests/withdrawals/model';
import * as events from './events';
import { BaseRequest, LogWithMetadata, ProviderState, Withdrawal } from 'src/types';

export function mapBaseRequests(state: ProviderState, logsWithMetadata: LogWithMetadata[]): BaseRequest<Withdrawal>[] {
  // Separate the logs
  const requestLogs = logsWithMetadata.filter((log) => events.isWithdrawalRequest(log.parsedLog));
  const fulfillmentLogs = logsWithMetadata.filter((log) => events.isWithdrawalFulfillment(log.parsedLog));

  // Cast raw logs to typed WithdrawalRequest objects
  const withdrawalRequests = requestLogs.map((rl) => model.initialize(rl));

  // Update the status of requests that have already been fulfilled
  const [fulfilledLogs, fulfilledWithdrawals] = model.updateFulfilledRequests(withdrawalRequests, fulfillmentLogs);
  logger.logPendingMessages(state.config.name, fulfilledLogs);

  return fulfilledWithdrawals;
}
