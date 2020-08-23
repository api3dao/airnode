import { BaseRequest, LogWithMetadata, RequestStatus, WalletDesignation } from '../../../types';

export function initialize(logWithMetadata: LogWithMetadata): BaseRequest<WalletDesignation> {
  const { parsedLog } = logWithMetadata;

  const request: BaseRequest<WalletDesignation> = {
    id: parsedLog.args.walletDesignationRequestId,
    status: RequestStatus.Pending,
    blockNumber: logWithMetadata.blockNumber,
    transactionHash: logWithMetadata.transactionHash,
    depositAmount: parsedLog.args.depositAmount,
    providerId: parsedLog.args.providerId,
    requesterId: parsedLog.args.requesterId,
    walletIndex: parsedLog.args.walletInd,
  };

  return request;
}
