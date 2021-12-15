import { ethers } from 'ethers';
import { Request, RequestStatus } from '../../types';
export function applyTransactionResult<T>(request: Request<T>, data: ethers.Transaction | null) {
  if (data && data.hash) {
    return { ...request, fulfillment: { hash: data.hash }, status: RequestStatus.Submitted };
  }

  return request;
}
