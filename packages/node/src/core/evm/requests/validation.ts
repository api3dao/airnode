import { ethers } from 'ethers';
import flatMap from 'lodash/flatMap';
import * as logger from '../../logger';
import * as utils from '../utils';
import {
  ApiCall,
  ClientRequest,
  GroupedRequests,
  LogsData,
  RequestErrorCode,
  RequestStatus,
  Withdrawal,
} from '../../../types';

function validateWalletIndex<T>(request: ClientRequest<T>): LogsData<ClientRequest<T>> {
  // If the request is already invalid, we don't want to overwrite the error
  if (request.status !== RequestStatus.Pending) {
    return [[], request];
  }

  // Check the request is not for the reserved wallet at index 0
  if (request.walletIndex === '0') {
    const log = logger.pend('ERROR', `Request ID:${request.id} has reserved wallet index 0`);
    const validatedRequest = {
      ...request,
      status: RequestStatus.Errored,
      errorCode: RequestErrorCode.ReservedWalletIndex,
    };
    return [[log], validatedRequest];
  }

  return [[], request];
}

function validateSufficientBalance<T>(request: ClientRequest<T>): LogsData<ClientRequest<T>> {
  // If the request is already invalid, we don't want to overwrite the error
  if (request.status !== RequestStatus.Pending) {
    return [[], request];
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
    return [[log], validatedRequest];
  }

  return [[], request];
}

function validateApiCall(request: ClientRequest<ApiCall>): LogsData<ClientRequest<ApiCall>> {
  const [indexLogs, indexRequest] = validateWalletIndex(request);
  if (indexRequest.status !== RequestStatus.Pending) {
    return [indexLogs, indexRequest];
  }

  const [sufficientBalLogs, sufficientBalRequest] = validateSufficientBalance(request);
  if (sufficientBalRequest.status !== RequestStatus.Pending) {
    return [sufficientBalLogs, sufficientBalRequest];
  }

  return [[], request];
}

function validateWithdrawal(request: ClientRequest<Withdrawal>): LogsData<ClientRequest<Withdrawal>> {
  const [sufficientBalLogs, sufficientBalRequest] = validateSufficientBalance(request);
  if (sufficientBalRequest.status !== RequestStatus.Pending) {
    return [sufficientBalLogs, sufficientBalRequest];
  }

  return [[], request];
}

export function validateRequests(requests: GroupedRequests): LogsData<GroupedRequests> {
  const apiCallsWithLogs = requests.apiCalls.map((apiCall) => validateApiCall(apiCall));
  const apiCallLogs = flatMap(apiCallsWithLogs, (a) => a[0]);
  const apiCalls = flatMap(apiCallsWithLogs, (a) => a[1]);

  const withdrawalsWithLogs = requests.withdrawals.map((withdrawal) => validateWithdrawal(withdrawal));
  const withdrawalLogs = flatMap(withdrawalsWithLogs, (w) => w[0]);
  const withdrawals = flatMap(withdrawalsWithLogs, (w) => w[1]);

  const validatedRequests = {
    ...requests,
    apiCalls,
    withdrawals,
  };

  return [[...apiCallLogs, ...withdrawalLogs], validatedRequests];
}
