import { ethers } from 'ethers';
import chunk from 'lodash/chunk';
import flatMap from 'lodash/flatMap';
import uniq from 'lodash/uniq';
import { config } from 'src/core/config';
import * as contracts from '../../contracts';
import { go, retryOperation } from 'src/core/utils/promise-utils';
import * as logger from 'src/core/utils/logger';
import {
  BaseRequest,
  ClientRequest,
  GroupedBaseRequests,
  GroupedRequests,
  LogsErrorData,
  PendingLog,
  RequesterData,
  RequestErrorCode,
  RequestStatus,
} from 'src/types';

interface FetchOptions {
  address: string;
  provider: ethers.providers.JsonRpcProvider;
}

interface RequesterDataByAddress {
  [address: string]: RequesterData;
}

type LogsRequesterData = [PendingLog[], RequesterDataByAddress];

async function fetchRequesterDataGroup(convenience: ethers.Contract, addresses: string[]): Promise<LogsRequesterData> {
  const { providerId } = config.nodeSettings;

  const contractCall = () => convenience.getDataWithClientAddresses(providerId, addresses);
  const retryableContractCall = retryOperation(2, contractCall, { timeouts: [4000, 4000] }) as Promise<any>;

  const [err, data] = await go(retryableContractCall);
  if (err || !data) {
    const errorLog = logger.pend('ERROR', 'Failed to fetch requester details', err);
    return [[errorLog], {}];
  }

  const requesterDataByAddress = addresses.reduce((acc, address, index) => {
    const requesterData: RequesterData = {
      requesterId: data.requesterIds[index],
      walletAddress: data.walletAddresses[index],
      walletIndex: data.walletInds[index].toString(),
      walletBalance: data.walletBalances[index].toString(),
      walletMinimumBalance: data.minBalances[index].toString(),
    };

    return { ...acc, [address]: requesterData };
  }, {});

  return [[], requesterDataByAddress];
}

export async function fetch(options: FetchOptions, requests: GroupedBaseRequests): Promise<LogsRequesterData> {
  const apiCallAddresses = requests.apiCalls.map((a) => a.requesterAddress);
  const withdrawalAddresses = requests.withdrawals.map((w) => w.destinationAddress);
  const addresses = [...apiCallAddresses, ...withdrawalAddresses];

  // Remove duplicate addresses to reduce calls
  const uniqueAddresses = uniq(addresses);

  // Request groups of 10 at a time
  const groupedAddresses = chunk(uniqueAddresses, 10);

  // Fetch all unique requester details in parallel
  const convenience = new ethers.Contract(options.address, contracts.Convenience.ABI, options.provider);
  const promises = groupedAddresses.map((addresses) => fetchRequesterDataGroup(convenience, addresses));

  const fetchLogsWithRequesterData = await Promise.all(promises);
  const fetchLogs = flatMap(fetchLogsWithRequesterData, (fl) => fl[0]);

  // Merge all results together
  const allRequesterDataByAddress = fetchLogsWithRequesterData.reduce((acc, result) => {
    return { ...acc, ...result[1] };
  }, {});

  return [fetchLogs, allRequesterDataByAddress];
}

function applyRequesterDataToRequest<T>(
  request: BaseRequest<T>,
  data?: RequesterData
): LogsErrorData<ClientRequest<T>> {
  if (!data) {
    const log = logger.pend('ERROR', `Unable to find requester data for Request ID:${request.id}`);

    const updatedRequest = {
      ...request,
      status: RequestStatus.Blocked,
      errorCode: RequestErrorCode.RequesterDataNotFound,
      requesterId: '',
      walletIndex: '-1',
      walletAddress: '',
      walletBalance: '0',
      walletMinimumBalance: '0',
    };
    return [[log], null, updatedRequest];
  }

  const updatedRequest = {
    ...request,
    requesterId: data.requesterId,
    walletIndex: data.walletIndex,
    walletAddress: data.walletAddress,
    walletBalance: data.walletBalance,
    walletMinimumBalance: data.walletMinimumBalance,
  };
  return [[], null, updatedRequest];
}

export function apply(requests: GroupedBaseRequests, data: RequesterDataByAddress): LogsErrorData<GroupedRequests> {
  const logsWithApiCalls = requests.apiCalls.map((apiCall) => {
    return applyRequesterDataToRequest(apiCall, data[apiCall.requesterAddress]);
  });
  const apiCallLogs = flatMap(logsWithApiCalls, (la) => la[0]);
  const apiCalls = logsWithApiCalls.map((la) => la[2]);

  const logsWithWithdrawals = requests.withdrawals.map((withdrawal) => {
    return applyRequesterDataToRequest(withdrawal, data[withdrawal.destinationAddress]);
  });
  const withdrawalLogs = flatMap(logsWithWithdrawals, (lw) => lw[0]);
  const withdrawals = logsWithWithdrawals.map((lw) => lw[2]);

  const logs = [...apiCallLogs, ...withdrawalLogs];
  const groupedRequests: GroupedRequests = { ...requests, apiCalls, withdrawals };

  return [logs, null, groupedRequests];
}
