import isNil from 'lodash/isNil';
import { ethers } from 'ethers';
import { logger, go } from '@api3/airnode-utilities';
import { applyTransactionResult } from './requests';
import * as wallet from '../wallet';
import { DEFAULT_RETRY_TIMEOUT_MS } from '../../constants';
import { Withdrawal, SubmitRequest } from '../../types';

export const submitWithdrawal: SubmitRequest<Withdrawal> = async (airnodeRrp, request, options) => {
  if (isNil(request.nonce)) {
    const log = logger.pend(
      'ERROR',
      `Withdrawal sponsor address:${request.sponsorAddress} for Request:${request.id} cannot be submitted as it does not have a nonce`
    );
    return [[log], null, null];
  }

  const sponsorWalletAddress = wallet.deriveSponsorWallet(options.masterHDNode, request.sponsorAddress).address;
  const getBalanceOperation = () => options.provider!.getBalance(sponsorWalletAddress);
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

  const estimateTx = (): Promise<ethers.BigNumber> =>
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
  const txCost = paddedGasLimit.mul(
    options.gasTarget.gasPrice ? options.gasTarget.gasPrice : options.gasTarget.maxFeePerGas!
  );
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

  const withdrawalTx = (): Promise<ethers.ContractTransaction> =>
    airnodeRrp.fulfillWithdrawal(request.id, request.airnodeAddress, request.sponsorAddress, {
      ...options.gasTarget,
      gasLimit: paddedGasLimit,
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

  return [[estimateLog, noticeLog], null, applyTransactionResult(request, withdrawalRes)];
};
