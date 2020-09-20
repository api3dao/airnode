import { BaseRequest, LogWithMetadata, RequestStatus, WalletDesignation } from '../../../types';

export function initialize(logWithMetadata: LogWithMetadata, providerIndex: number): BaseRequest<WalletDesignation> {
  const { parsedLog } = logWithMetadata;

  const request: BaseRequest<WalletDesignation> = {
    id: parsedLog.args.walletDesignationRequestId,
    status: RequestStatus.Pending,
    depositAmount: parsedLog.args.depositAmount.toString(),
    providerId: parsedLog.args.providerId,
    requesterId: parsedLog.args.requesterId,
    walletIndex: parsedLog.args.walletInd.toString(),
    metadata: {
      providerIndex,
      blockNumber: logWithMetadata.blockNumber,
      transactionHash: logWithMetadata.transactionHash,
    },
  };

  return request;
}
