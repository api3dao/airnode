import { ethers } from 'ethers';
import { BaseRequest, Withdrawal } from '../../../../types';

export function initialize(log: ethers.utils.LogDescription): BaseRequest<Withdrawal> {
  const request: BaseRequest<Withdrawal> = {
    id: log.args.withdrawRequestId,
    destination: log.args.destination,
    providerId: log.args.providerId,
    requesterId: log.args.requesterId,
    valid: true,
  };

  return request;
}
