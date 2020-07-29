import { ethers } from 'ethers';
import chunk from 'lodash/chunk';
import uniq from 'lodash/uniq';
import { config } from '../../config';
import * as ethereum from '../../ethereum';
import { go, retryOperation } from '../../utils/promise-utils';
import * as logger from '../../utils/logger';
import {
  ApiCall,
  BaseRequest,
  DirectRequest,
  GroupedProviderRequests,
  ProviderState,
  RequesterData,
  RequestErrorCode,
} from '../../../types';

type RequesterDataByAddress = {
  [address: string]: RequesterData;
};

export interface InitialGroupedRequests {
  apiCalls: BaseRequest<ApiCall>[];
  withdrawals: any;
  walletAuthorizations: any;
}

async function fetchRequesterData(state: ProviderState, addresses: string[]): Promise<RequesterDataByAddress | null> {
  const { Convenience } = ethereum.contracts;
  const { providerId } = config.nodeSettings;

  const contract = new ethers.Contract(Convenience.addresses[state.config.chainId], Convenience.ABI, state.provider);
  const contractCall = () => contract.getDataWithClientAddresses(providerId, addresses);
  const retryableContractCall = retryOperation(2, contractCall, { timeouts: [4000, 4000] }) as Promise<any>;

  const [err, data] = await go(retryableContractCall);
  // TODO: how do we differentiate between timeouts and errors in the contract, like authorization issues?
  if (err || !data) {
    logger.logProviderError(state.config.name, 'Failed to fetch requester details', err);
    return null;
  }

  const responses = addresses.reduce((acc, address, index) => {
    const requesterData: RequesterData = {
      requesterId: data.requesterIds[index],
      walletAddress: data.walletAddresses[index],
      walletIndex: data.walletInds[index],
      walletBalance: data.walletBalances[index],
      walletMinimumBalance: data.minBalances[index],
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
  const promises = groupedAddresses.map((addresses) => fetchRequesterData(state, addresses));

  const results = await Promise.all(promises);

  const successfulResults = results.filter((r) => !!r) as RequesterDataByAddress[];

  // Merge all results together
  const resultsByAddress = successfulResults.reduce((acc, result) => {
    return { ...acc, ...result };
  }, {});

  return resultsByAddress;
}

export function apply(
  state: ProviderState,
  requests: InitialGroupedRequests,
  data: RequesterDataByAddress
): GroupedProviderRequests {
  const apiCalls = requests.apiCalls.map((a) => applyRequesterData(state, a, data[a.requesterAddress]));

  return {
    apiCalls,
    walletAuthorizations: [],
    withdrawals: [],
  };
}

function applyRequesterData<T>(state: ProviderState, request: BaseRequest<T>, data?: RequesterData): DirectRequest<T> {
  if (!data) {
    const message = `Unable to find wallet data for Request ID:${request.id}`;
    logger.logProviderJSON(state.config.name, 'ERROR', message);

    return {
      ...request,
      valid: false,
      errorCode: RequestErrorCode.RequesterDataNotFound,
      requesterId: '',
      walletIndex: -1,
      walletAddress: '',
      walletBalance: ethereum.weiToBigNumber('0'),
      walletMinimumBalance: ethereum.weiToBigNumber('0'),
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
