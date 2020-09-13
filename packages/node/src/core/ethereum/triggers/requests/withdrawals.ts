import * as model from '../../../requests/withdrawals/model';
import * as events from './events';
import { BaseRequest, LogsErrorData, LogWithMetadata, Withdrawal } from '../../../../types';

export function mapBaseRequests(logsWithMetadata: LogWithMetadata[]): LogsErrorData<BaseRequest<Withdrawal>[]> {
  // Separate the logs
  const requestLogs = logsWithMetadata.filter((log) => events.isWithdrawalRequest(log.parsedLog));
  const fulfillmentLogs = logsWithMetadata.filter((log) => events.isWithdrawalFulfillment(log.parsedLog));

  // Cast raw logs to typed WithdrawalRequest objects
  const withdrawalRequests = requestLogs.map((rl) => model.initialize(rl));

  // Update the status of requests that have already been fulfilled
  const [fulfilledLogs, fulfilledWithdrawals] = model.updateFulfilledRequests(withdrawalRequests, fulfillmentLogs);

  return [fulfilledLogs, null, fulfilledWithdrawals];
}
