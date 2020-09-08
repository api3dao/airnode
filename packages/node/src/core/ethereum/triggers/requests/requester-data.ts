import { ethers } from 'ethers';
import chunk from 'lodash/chunk';
import uniq from 'lodash/uniq';
import { config } from 'src/core/config';
import * as ethereum from 'src/core/ethereum';
import { go, retryOperation } from 'src/core/utils/promise-utils';
import * as logger from 'src/core/utils/logger';
import {
  ApiCall,
  BaseRequest,
  ClientRequest,
  GroupedRequests,
  ProviderState,
  RequesterData,
  RequestErrorCode,
  RequestStatus,
  WalletDesignation,
  Withdrawal,
} from 'src/types';

type RequesterDataByAddress = {
  [address: string]: RequesterData;
};

export interface GroupedBaseRequests {
  apiCalls: BaseRequest<ApiCall>[];
  withdrawals: BaseRequest<Withdrawal>[];
  walletDesignations: BaseRequest<WalletDesignation>[];
}

async function fetchRequesterDataGroup(
  state: ProviderState,
  addresses: string[]
): Promise<RequesterDataByAddress | null> {
  const { Convenience } = ethereum.contracts;
  const { providerId } = config.nodeSettings;

  const contract = new ethers.Contract(Convenience.addresses[state.config.chainId], Convenience.ABI, state.provider);
  const contractCall = () => contract.getDataWithClientAddresses(providerId, addresses);
  const retryableContractCall = retryOperation(2, contractCall, { timeouts: [4000, 4000] }) as Promise<any>;

  const [err, data] = await go(retryableContractCall);
  if (err || !data) {
    logger.logProviderError(state.config.name, 'Failed to fetch requester details', err);
    return null;
  }

  const responses = addresses.reduce((acc, address, index) => {
    const requesterData: RequesterData = {
      requesterId: data.requesterIds[index],
      walletAddress: data.walletAddresses[index],
      walletIndex: data.walletInds[index].toString(),
      walletBalance: data.walletBalances[index].toString(),
      walletMinimumBalance: data.minBalances[index].toString(),
    };

    return { ...acc, [address]: requesterData };
  }, {});

  return responses;
}

export async function fetch(state: ProviderState, addresses: string[]): Promise<RequesterDataByAddress> {
  // Remove duplicate addresses to reduce calls
  const uniqueAddresses = uniq(addresses);

  // Request groups of 10 at a time
  const groupedAddresses = chunk(uniqueAddresses, 10);

  // Fetch all unique requester details in parallel
  const promises = groupedAddresses.map((addresses) => fetchRequesterDataGroup(state, addresses));

  const results = await Promise.all(promises);
  const successfulResults = results.filter((r) => !!r) as RequesterDataByAddress[];

  // Merge all results together
  const resultsByAddress = successfulResults.reduce((acc, result) => {
    return { ...acc, ...result };
  }, {});

  return resultsByAddress;
}

function applyRequesterDataToRequest<T>(
  state: ProviderState,
  request: BaseRequest<T>,
  data?: RequesterData
): ClientRequest<T> {
  if (!data) {
    const message = `Unable to find requester data for Request ID:${request.id}`;
    logger.logProviderJSON(state.config.name, 'ERROR', message);

    return {
      ...request,
      status: RequestStatus.Blocked,
      errorCode: RequestErrorCode.RequesterDataNotFound,
      requesterId: '',
      walletIndex: '-1',
      walletAddress: '',
      walletBalance: '0',
      walletMinimumBalance: '0',
    };
  }

  return {
    ...request,
    requesterId: data.requesterId,
    walletIndex: data.walletIndex,
    walletAddress: data.walletAddress,
    walletBalance: data.walletBalance,
    walletMinimumBalance: data.walletMinimumBalance,
  };
}

export function apply(
  state: ProviderState,
  requests: GroupedBaseRequests,
  data: RequesterDataByAddress
): GroupedRequests {
  // NOTE: wallet designations do not have requester data
  const apiCalls = requests.apiCalls.map((a) => applyRequesterDataToRequest(state, a, data[a.requesterAddress]));
  const withdrawals = requests.withdrawals.map((w) =>
    applyRequesterDataToRequest(state, w, data[w.destinationAddress])
  );

  return { ...requests, apiCalls, withdrawals };
}
