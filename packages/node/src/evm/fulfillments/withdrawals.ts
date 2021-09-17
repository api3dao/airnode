import isNil from 'lodash/isNil';
import { ethers } from 'ethers';
import { go } from '../../utils/promise-utils';
import * as logger from '../../logger';
import * as wallet from '../wallet';
import { DEFAULT_RETRY_TIMEOUT_MS } from '../../constants';
import { Request, LogsErrorData, RequestStatus, TransactionOptions, Withdrawal } from '../../types';
import { AirnodeRrp } from '../contracts';

type SubmitResponse = ethers.Transaction | null;

export async function submitWithdrawal(
  airnodeRrp: AirnodeRrp,
  request: Request<Withdrawal>,
  options: TransactionOptions
): Promise<LogsErrorData<SubmitResponse>> {
  if (request.status !== RequestStatus.Pending) {
    const logStatus = request.status === RequestStatus.Fulfilled ? 'DEBUG' : 'INFO';
    const log = logger.pend(
      logStatus,
      `Withdrawal sponsor address:${request.sponsorAddress} for Request:${request.id} not actioned as it has status:${request.status}`
    );
    return [[log], null, null];
  }

  if (isNil(request.nonce)) {
    const log = logger.pend(
      'ERROR',
      `Withdrawal sponsor address:${request.sponsorAddress} for Request:${request.id} cannot be submitted as it does not have a nonce`
    );
    return [[log], null, null];
  }

  const sponsorAddress = wallet.deriveSponsorWallet(options.masterHDNode, request.sponsorAddress).address;
  const getBalanceOperation = () => options.provider!.getBalance(sponsorAddress);
  const [balanceErr, currentBalance] = await go(getBalanceOperation, {
    retries: 1,
    timeoutMs: DEFAULT_RETRY_TIMEOUT_MS,
  });
  if (balanceErr || !currentBalance) {
    const errLog = logger.pend(
      'ERROR',
      `Failed to fetch sponsor address:${request.sponsorAddress} balance for Request:${request.id}`,
      balanceErr
    );
    return [[errLog], balanceErr, null];
  }

  const estimateTx = () =>
    airnodeRrp.estimateGas.fulfillWithdrawal(
      request.id,
      request.airnodeAddress,
      request.sponsorAddress,
      // We need to send some funds for the gas price calculation to be correct
      // We also can't send the current balance as that would cause the withdrawal
      // to revert. The transaction cost would need to be subtracted first
      { value: 1 }
    );
  // The node calculates how much gas the next transaction will cost (53,654)
  const [estimateErr, estimatedGasLimit] = await go(estimateTx, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
  if (estimateErr || !estimatedGasLimit) {
    const estimateErrorLog = logger.pend(
      'ERROR',
      `Error estimating withdrawal gas limit for Request:${request.id}`,
      estimateErr
    );
    return [[estimateErrorLog], estimateErr, null];
  }

  // Overestimate the gas limit just in case
  const paddedGasLimit = estimatedGasLimit.add(ethers.BigNumber.from(20_000));

  const estimateLog = logger.pend(
    'DEBUG',
    `Withdrawal gas limit estimated at ${paddedGasLimit.toString()} for Request:${request.id}`
  );

  // We set aside some ETH to pay for the gas of the following transaction,
  // send all the rest along with the transaction. The contract will direct
  // these funds back to the sponsor wallet.
  const txCost = paddedGasLimit.mul(options.gasPrice);
  const fundsToSend = currentBalance.sub(txCost);

  // We can't submit a withdrawal with a negative amount
  if (fundsToSend.lt(0)) {
    const amt = ethers.utils.formatEther(fundsToSend);
    const message = `Unable to submit negative withdrawal amount for Request:${request.id}. Amount: ${amt} ETH`;
    const negativeLog = logger.pend('INFO', message);
    return [[estimateLog, negativeLog], null, null];
  }

  const noticeLog = logger.pend(
    'INFO',
    `Submitting withdrawal sponsor address:${request.sponsorAddress} for Request:${request.id}...`
  );

  const withdrawalTx = () =>
    airnodeRrp.fulfillWithdrawal(request.id, request.airnodeAddress, request.sponsorAddress, {
      gasLimit: paddedGasLimit,
      gasPrice: options.gasPrice!,
      nonce: request.nonce!,
      value: fundsToSend,
    });
  // Note that we're using the sponsor address to call this
  const [withdrawalErr, withdrawalRes] = await go(withdrawalTx, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
  if (withdrawalErr || !withdrawalRes) {
    const withdrawalErrLog = logger.pend(
      'ERROR',
      `Error submitting sponsor address:${request.sponsorAddress} withdrawal for Request:${request.id}`,
      withdrawalErr
    );
    const logs = [estimateLog, noticeLog, withdrawalErrLog];
    return [logs, withdrawalErr, null];
  }

  return [[estimateLog, noticeLog], null, withdrawalRes as ethers.Transaction];
}
