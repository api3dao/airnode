import { ethers } from 'ethers';
import { BaseRequest, WalletAuthorization } from '../../../../types';

export function initialize(log: ethers.utils.LogDescription): BaseRequest<WalletAuthorization> {
  const request: BaseRequest<WalletAuthorization> = {
    id: log.args.withdrawRequestId,
    destination: log.args.destination,
    providerId: log.args.providerId,
    requesterId: log.args.requesterId,
    valid: true,
  };

  return request;
}
