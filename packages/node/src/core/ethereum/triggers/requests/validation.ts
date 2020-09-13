import { ethers } from 'ethers';
import flatMap from 'lodash/flatMap';
import * as logger from '../../../utils/logger';
import * as utils from '../../utils';
import { ClientRequest, GroupedRequests, LogsErrorData, PendingLog, RequestErrorCode, RequestStatus } from '../../../../types';

type LogsWithRequest<T> = [PendingLog[], ClientRequest<T>];

function validateRequest<T>(request: ClientRequest<T>): LogsWithRequest<T> {
  // If the request is already invalid, we don't want to overwrite the error
  if (request.status !== RequestStatus.Pending) {
    return [[], request];
  }

  // Check the request is not for the reserved wallet at index 0
  if (request.walletIndex === '0') {
    const log = logger.pend('ERROR', `Request ID:${request.id} has reserved wallet index 0.`);
    const validatedRequest = {
      ...request,
      status: RequestStatus.Errored,
      errorCode: RequestErrorCode.ReservedWalletIndex,
    };
    return [[log], validatedRequest];
  }

  const balance = utils.weiToBigNumber(request.walletBalance);
  const minBalance = utils.weiToBigNumber(request.walletMinimumBalance);

  // Check the request wallet has enough funds to be able to make transactions
  if (balance.lt(minBalance)) {
    const currentBalance = ethers.utils.formatEther(request.walletBalance);
    const minBalance = ethers.utils.formatEther(request.walletMinimumBalance);
    const log = logger.pend(
      'ERROR',
      `Request ID:${request.id} wallet has insufficient balance of ${currentBalance} ETH. Minimum balance of ${minBalance} ETH is required.`
    );
    const validatedRequest = {
      ...request,
      status: RequestStatus.Errored,
      errorCode: RequestErrorCode.InsufficientBalance,
    };
    return [[log], validatedRequest];
  }

  return [[], request];
}

export function validateRequests(requests: GroupedRequests): LogsErrorData<GroupedRequests> {
  const apiCallsWithLogs = requests.apiCalls.map((apiCall) => validateRequest(apiCall));
  const apiCallLogs = flatMap(apiCallsWithLogs, (a) => a[0]);
  const apiCalls = flatMap(apiCallsWithLogs, (a) => a[1]);

  const validatedRequests = {
    apiCalls,
    walletDesignations: [],
    withdrawals: [],
  };

  return [apiCallLogs, null, validatedRequests];
}
