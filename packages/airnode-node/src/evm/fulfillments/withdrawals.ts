import isNil from 'lodash/isNil';
import { ethers } from 'ethers';
import { logger } from '@api3/airnode-utilities';
import { go } from '@api3/promise-utils';
import { applyTransactionResult } from './requests';
import * as wallet from '../wallet';
import { BLOCKCHAIN_CALL_ATTEMPT_TIMEOUT } from '../../constants';
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

  const goCurrentBalance = await go(() => options.provider!.getBalance(sponsorWalletAddress), {
    retries: 1,
    attemptTimeoutMs: BLOCKCHAIN_CALL_ATTEMPT_TIMEOUT,
  });
  if (!goCurrentBalance.success) {
    const errLog = logger.pend(
      'ERROR',
      `Failed to fetch sponsor address:${request.sponsorAddress} balance for Request:${request.id}`,
      goCurrentBalance.error
    );
    return [[errLog], goCurrentBalance.error, null];
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
  const goEstimatedGasLimit = await go(estimateTx, { retries: 1, attemptTimeoutMs: BLOCKCHAIN_CALL_ATTEMPT_TIMEOUT });
  if (!goEstimatedGasLimit.success) {
    const estimateErrorLog = logger.pend(
      'ERROR',
      `Error estimating withdrawal gas limit for Request:${request.id}`,
      goEstimatedGasLimit.error
    );
    return [[estimateErrorLog], goEstimatedGasLimit.error, null];
  }

  // Overestimate the gas limit just in case
  const paddedGasLimit = goEstimatedGasLimit.data.add(ethers.BigNumber.from(20_000));

  const estimateLog = logger.pend(
    'DEBUG',
    `Withdrawal gas limit estimated at ${paddedGasLimit.toString()} for Request:${request.id}`
  );

  // We set aside some ETH to pay for the gas of the following transaction and
  // return the rest to the sponsor wallet less a remainder, if specified.
  // Specifying a remainder is only necessary for certain chains e.g. Optimism.
  const remainder = options.withdrawalRemainder
    ? ethers.utils.parseUnits(options.withdrawalRemainder.value.toString(), options.withdrawalRemainder.unit)
    : 0;
  const txCost = paddedGasLimit.mul(
    options.gasTarget.type === 2 ? options.gasTarget.maxFeePerGas : options.gasTarget.gasPrice
  );
  const fundsToSend = goCurrentBalance.data.sub(txCost).sub(remainder);

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
  const goWithdrawalRes = await go(withdrawalTx, { retries: 1, attemptTimeoutMs: BLOCKCHAIN_CALL_ATTEMPT_TIMEOUT });
  if (!goWithdrawalRes.success) {
    const withdrawalErrLog = logger.pend(
      'ERROR',
      `Error submitting sponsor address:${request.sponsorAddress} withdrawal for Request:${request.id}`,
      goWithdrawalRes.error
    );
    const logs = [estimateLog, noticeLog, withdrawalErrLog];
    return [logs, goWithdrawalRes.error, null];
  }

  return [[estimateLog, noticeLog], null, applyTransactionResult(request, goWithdrawalRes.data)];
};
