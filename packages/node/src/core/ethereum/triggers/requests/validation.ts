import { ethers } from 'ethers';
import flatMap from 'lodash/flatMap';
import * as logger from '../../../utils/logger';
import * as utils from '../../utils';
import { ApiCall, ClientRequest, GroupedRequests, LogsErrorData, RequestErrorCode, RequestStatus, Withdrawal } from '../../../../types';

function validateWalletIndex<T>(request: ClientRequest<T>): LogsErrorData<ClientRequest<T>> {
  // If the request is already invalid, we don't want to overwrite the error
  if (request.status !== RequestStatus.Pending) {
    return [[], null, request];
  }

  // Check the request is not for the reserved wallet at index 0
  if (request.walletIndex === '0') {
    const log = logger.pend('ERROR', `Request ID:${request.id} has reserved wallet index 0`);
    const validatedRequest = {
      ...request,
      status: RequestStatus.Errored,
      errorCode: RequestErrorCode.ReservedWalletIndex,
    };
    return [[log], null, validatedRequest];
  }

  return [[], null, request];
}

function validateSufficientBalance<T>(request: ClientRequest<T>): LogsErrorData<ClientRequest<T>> {
  // If the request is already invalid, we don't want to overwrite the error
  if (request.status !== RequestStatus.Pending) {
    return [[], null, request];
  }

  const balance = utils.weiToBigNumber(request.walletBalance);
  const minBalance = utils.weiToBigNumber(request.walletMinimumBalance);

  // Check the request wallet has enough funds to be able to make transactions
  if (balance.lt(minBalance)) {
    const currentBalance = ethers.utils.formatEther(request.walletBalance);
    const minBalance = ethers.utils.formatEther(request.walletMinimumBalance);
    const log = logger.pend(
      'ERROR',
      `Request ID:${request.id} wallet has insufficient balance of ${currentBalance} ETH. Minimum balance of ${minBalance} ETH is required`
    );
    const validatedRequest = {
      ...request,
      status: RequestStatus.Ignored,
      errorCode: RequestErrorCode.InsufficientBalance,
    };
    return [[log], null, validatedRequest];
  }

  return [[], null, request];
}

function validateApiCall(request: ClientRequest<ApiCall>): LogsErrorData<ClientRequest<ApiCall>> {
  const [indexLogs, indexErr, indexRequest] = validateWalletIndex(request);
  if (indexRequest.status !== RequestStatus.Pending || indexErr) {
    return [indexLogs, indexErr, indexRequest];
  }

  const [sufficientBalLogs, sufficientBalErr, sufficientBalRequest] = validateSufficientBalance(request);
  if (sufficientBalRequest.status !== RequestStatus.Pending || sufficientBalErr) {
    return [sufficientBalLogs, sufficientBalErr, sufficientBalRequest];
  }

  return [[], null, request];
}

function validateWithdrawal(request: ClientRequest<Withdrawal>): LogsErrorData<ClientRequest<Withdrawal>> {
  const [sufficientBalLogs, sufficientBalErr, sufficientBalRequest] = validateSufficientBalance(request);
  if (sufficientBalRequest.status !== RequestStatus.Pending || sufficientBalErr) {
    return [sufficientBalLogs, sufficientBalErr, sufficientBalRequest];
  }

  return [[], null, request];
}

export function validateRequests(requests: GroupedRequests): LogsErrorData<GroupedRequests> {
  const apiCallsWithLogs = requests.apiCalls.map((apiCall) => validateApiCall(apiCall));
  const apiCallLogs = flatMap(apiCallsWithLogs, (a) => a[0]);
  const apiCalls = flatMap(apiCallsWithLogs, (a) => a[2]);

  const withdrawalsWithLogs = requests.withdrawals.map((withdrawal) => validateWithdrawal(withdrawal));
  const withdrawalLogs = flatMap(withdrawalsWithLogs, (w) => w[0]);
  const withdrawals = flatMap(withdrawalsWithLogs, (w) => w[2]);

  const validatedRequests = {
    ...requests,
    apiCalls,
    withdrawals,
  };

  return [[...apiCallLogs, ...withdrawalLogs], null, validatedRequests];
}
