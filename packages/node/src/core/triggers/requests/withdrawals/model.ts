import { ethers } from 'ethers';
import { WithdrawalRequest } from '../../../../types';

export function initialize(log: ethers.utils.LogDescription): WithdrawalRequest {
  const request: WithdrawalRequest = {
    destination: log.args.destination,
    providerId: log.args.providerId,
    requesterId: log.args.requesterId,
    withdrawRequestId: log.args.withdrawRequestId,
  };

  return request;
}
