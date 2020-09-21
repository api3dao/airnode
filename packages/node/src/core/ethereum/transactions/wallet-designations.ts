import { ethers } from 'ethers';
import * as logger from '../../utils/logger';
import { go } from '../../utils/promise-utils';
import { BaseRequest, LogsErrorData, RequestStatus, TransactionOptions, WalletDesignation } from '../../../types';

const GAS_LIMIT = 150_000;

type SubmitResponse = ethers.Transaction | null;

export async function submitWalletDesignation(
  airnode: ethers.Contract,
  request: BaseRequest<WalletDesignation>,
  options: TransactionOptions
): Promise<LogsErrorData<SubmitResponse>> {
  // No need to log anything if the request is already fulfilled
  if (request.status === RequestStatus.Fulfilled) {
    return [[], null, null];
  }

  if (request.status === RequestStatus.Pending) {
    const noticeLog = logger.pend(
      'INFO',
      `Submitting wallet designation index:${request.walletIndex} for Request:${request.id}...`
    );

    const tx = airnode.fulfillWalletDesignation(request.id, request.walletIndex, {
      gasPrice: options.gasPrice!,
      gasLimit: GAS_LIMIT,
      nonce: request.nonce!,
    });

    const [err, res] = await go(tx);
    if (err) {
      const errorLog = logger.pend(
        'ERROR',
        `Error submitting wallet designation index:${request.walletIndex} for Request:${request.id}. ${err}`
      );
      return [[noticeLog, errorLog], err, null];
    }
    return [[noticeLog], null, res as ethers.Transaction];
  }

  const noticeLog = logger.pend(
    'INFO',
    `Wallet designation index:${request.walletIndex} for Request:${request.id} not actioned as it has status:${request.status}`
  );

  return [[noticeLog], null, null];
}
