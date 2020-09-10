import { ethers } from 'ethers';
import { go } from '../../utils/promise-utils';
import * as logger from '../../utils/logger';
import * as wallet from '../wallet';
import {
  ClientRequest,
  LogsWithData,
  RequestStatus,
  TransactionOptions,
  Withdrawal,
} from '../../../types';

export async function submitWithdrawal(
  airnode: ethers.Contract,
  request: ClientRequest<Withdrawal>,
  options: TransactionOptions,
): Promise<LogsWithData> {
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
      const estimateErrorLog = logger.pend('ERROR', `Error estimating withdrawal gas limit for Request:${request.id}. ${estimateErr}`);
      return [[estimateErrorLog], estimateErr, null];
    }
    const estimateLog = logger.pend('DEBUG', `Gas limit estimated at ${estimatedGasLimit?.toString()} for Request:${request.id}`);

    const txCost = estimatedGasLimit.mul(options.gasPrice);
    // We set aside some ETH to pay for the gas of the following transaction,
    // send all the rest along with the transaction. The contract will direct
    // these funds to the destination given at the request.
    const xpub = wallet.getExtendedPublicKey();
    const requesterAddress = wallet.deriveWalletAddressFromIndex(xpub, options.walletIndex!);
    const reservedWalletBalance = await options.provider!.getBalance(requesterAddress);
    const fundsToSend = reservedWalletBalance.sub(txCost);

    const noticeLog = logger.pend('INFO', `Fulfilling withdrawal for Request:${request.id}...`);

    const withdrawalTx = airnode.fulfillWithdrawal(request.id, {
      gasLimit: estimatedGasLimit,
      gasPrice: options.gasPrice!,
      nonce: request.nonce!,
      value: fundsToSend,
    });

    // Note that we're using the requester wallet to call this
    const [withdrawalErr, withdrawalRes] = await go(withdrawalTx);
    if (withdrawalErr || !withdrawalRes) {
      const withdrawalErrLog = logger.pend('ERROR', `Error submitting withdrawal for Request:${request.id}. ${withdrawalErr}`);
      const logs = [estimateLog, noticeLog, withdrawalErrLog];
      return [logs, withdrawalErr, null];
    }

    return [[estimateLog, noticeLog], null, withdrawalRes];
  }

  const noticeLog = logger.pend('INFO', `Withdrawal for Request:${request.id} not actioned as it has status:${request.status}`);

  return [[noticeLog], null, null];
}
