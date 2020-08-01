import { ethers } from 'ethers';
import { BaseRequest, Withdrawal } from '../../../../types';

export function initialize(log: ethers.utils.LogDescription): BaseRequest<Withdrawal> {
  const request: BaseRequest<Withdrawal> = {
    id: log.args.withdrawalRequestId,
    providerId: log.args.providerId,
    requesterId: log.args.requesterId,
    destinationAddress: log.args.destination,
    valid: true,
  };

  return request;
}
