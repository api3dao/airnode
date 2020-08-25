import { BaseRequest, LogWithMetadata, RequestStatus, Withdrawal } from '../../../types';

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
