import { ethers } from 'ethers';
import { BaseRequest, WalletDesignation } from '../../../../types';

export function initialize(log: ethers.utils.LogDescription): BaseRequest<WalletDesignation> {
  const request: BaseRequest<WalletDesignation> = {
    id: log.args.walletDesignationRequestId,
    depositAmount: log.args.depositAmount,
    providerId: log.args.providerId,
    requesterId: log.args.requesterId,
    walletIndex: log.args.walletInd,
    valid: true,
  };

  return request;
}
