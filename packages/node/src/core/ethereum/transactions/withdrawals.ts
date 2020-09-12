import { ethers } from 'ethers';
import { go } from '../../utils/promise-utils';
import * as logger from '../../utils/logger';
import * as wallet from '../wallet';
import { ClientRequest, LogsErrorData, RequestStatus, TransactionOptions, Withdrawal } from '../../../types';

export async function submitWithdrawal(
  airnode: ethers.Contract,
  request: ClientRequest<Withdrawal>,
  options: TransactionOptions
): Promise<LogsErrorData> {
  if (request.status === RequestStatus.Fulfilled) {
    return [[], null, null];
  }

  if (request.status === RequestStatus.Pending) {
    const estimateTx = airnode.estimateGas.fulfillWithdrawal(request.id, {
      // We need to send some funds for the gas price calculation to be correct
      value: 1,
    });

    // The node calculates how much gas the next transaction will cost (53,654)
    const [estimateErr, estimatedGasLimit] = await go(estimateTx);
    if (estimateErr || !estimatedGasLimit) {
      const estimateErrorLog = logger.pend(
        'ERROR',
        `Error estimating withdrawal gas limit for Request:${request.id}. ${estimateErr}`
      );
      return [[estimateErrorLog], estimateErr, null];
    }
    const estimateLog = logger.pend(
      'DEBUG',
      `Withdrawal gas limit estimated at ${estimatedGasLimit.toString()} for Request:${request.id}`
    );

    const txCost = estimatedGasLimit.mul(options.gasPrice);
    // We set aside some ETH to pay for the gas of the following transaction,
    // send all the rest along with the transaction. The contract will direct
    // these funds to the destination given at the request.
    const xpub = wallet.getExtendedPublicKey();
    const requesterAddress = wallet.deriveWalletAddressFromIndex(xpub, request.walletIndex!);
    const [balanceErr, currentBalance] = await go(options.provider!.getBalance(requesterAddress));
    if (balanceErr || !currentBalance) {
      const balanceErrorLog = logger.pend(
        'ERROR',
        `Failed to fetch wallet index:${request.walletIndex} balance for Request:${request.id}. ${balanceErr}`
      );
      return [[estimateLog, balanceErrorLog], balanceErr, null];
    }

    const fundsToSend = currentBalance.sub(txCost);

    const noticeLog = logger.pend(
      'INFO',
      `Submitting withdrawal wallet index:${request.walletIndex} for Request:${request.id}...`
    );

    const withdrawalTx = airnode.fulfillWithdrawal(request.id, {
      gasLimit: estimatedGasLimit,
      gasPrice: options.gasPrice!,
      nonce: request.nonce!,
      value: fundsToSend,
    });

    // Note that we're using the requester wallet to call this
    const [withdrawalErr, withdrawalRes] = await go(withdrawalTx);
    if (withdrawalErr || !withdrawalRes) {
      const withdrawalErrLog = logger.pend(
        'ERROR',
        `Error submitting wallet index:${request.walletIndex} withdrawal for Request:${request.id}. ${withdrawalErr}`
      );
      const logs = [estimateLog, noticeLog, withdrawalErrLog];
      return [logs, withdrawalErr, null];
    }

    return [[estimateLog, noticeLog], null, withdrawalRes];
  }

  const noticeLog = logger.pend(
    'INFO',
    `Withdrawal wallet index:${request.walletIndex} for Request:${request.id} not actioned as it has status:${request.status}`
  );

  return [[noticeLog], null, null];
}
