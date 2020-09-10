import { ethers } from 'ethers';
import * as logger from '../../utils/logger';
import { go } from '../../utils/promise-utils';
import { BaseRequest, LogsWithData, RequestStatus, TransactionOptions, WalletDesignation } from '../../../types';

export async function submitWalletDesignation(
  airnode: ethers.Contract,
  request: BaseRequest<WalletDesignation>,
  options: TransactionOptions
): Promise<LogsWithData> {
  // No need to log anything if the request is already fulfilled
  if (request.status === RequestStatus.Fulfilled) {
    return [[], null, null];
  }

  if (request.status === RequestStatus.Pending) {
    const noticeLog = logger.pend('INFO', `Fulfilling wallet designation for Request:${request.id}...`);

    const tx = airnode.fulfillWalletDesignation(request.id, request.walletIndex, {
      gasPrice: options.gasPrice!,
      gasLimit: 150000,
      nonce: request.nonce!,
    });

    const [err, res] = await go(tx);
    if (err) {
      const errorLog = logger.pend('ERROR', `Error submitting withdrawal for Request:${request.id}. ${err}`);
      return [[noticeLog, errorLog], err, null];
    }
    return [[noticeLog], null, res];
  }

  const noticeLog = logger.pend(
    'INFO',
    `Withdrawal for Request:${request.id} not actioned as it has status:${request.status}`
  );

  return [[noticeLog], null, null];
}
