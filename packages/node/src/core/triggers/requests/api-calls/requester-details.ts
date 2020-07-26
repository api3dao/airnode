import { ethers } from 'ethers';
import uniq from 'lodash/uniq';
import { config } from '../../../config';
import * as ethereum from '../../../ethereum';
import { ApiCallRequest, ApiRequestErrorCode, ProviderState } from '../../../../types';
import { goTimeout, retryOperation } from '../../../utils/promise-utils';
import * as logger from '../../../utils/logger';
import * as model from './model';

const TIMEOUT = 5000;

// Alias types
type ApiCallInitialRequest = model.ApiCallInitialRequest;

type RequesterData = {
  [requesterAddress: string]: any;
}

async function fetchRequesterData(state: ProviderState, requesterAddress: string): Promise<RequesterData | null> {
  const { Convenience } = ethereum.contracts;
  const { providerId } = config.nodeSettings;

  const contract = new ethers.Contract(Convenience.addresses[state.config.chainId], Convenience.ABI, state.provider);
  const contractCall = () => contract.getDataWithClientAddress(providerId, requesterAddress) as Promise<any>;
  const retryableContractCall = retryOperation(2, contractCall, { timeouts: [4000, 4000] });

  const [err, data] = await goTimeout(TIMEOUT, retryableContractCall);
  // TODO: how do we differentiate between timeouts and errors in the contract, like authorization issues?
  if (err || !data) {
    logger.logProviderError(state.config.name, 'Failed to fetch requester details', err);
    return null;
  }
  return { requesterAddress, data };
}

export async function fetch(state: ProviderState, initialRequests: ApiCallInitialRequest[]): Promise<RequesterData> {
  // Calls for requests that are already invalid are wasted
  const validApiRequests = initialRequests.filter((r) => r.valid);

  // Get a unique list of all requester addresses
  const requesterAddresses = uniq(validApiRequests.map((r) => r.requesterAddress));

  // Fetch all unique requester details in parallel
  const promises = requesterAddresses.map((address) => fetchRequesterData(state, address));

  const results = await Promise.all(promises);

  const successfulResults = results.filter((r) => !!r) as RequesterData[];

  // Key each result by the requester address to allow for easier lookup
  const resultsByAddress = successfulResults.reduce((acc, result) => {
    return { ...acc, [result.requesterAddress]: result.data };
  }, {});

  return resultsByAddress;
}

export function apply(state: ProviderState, requests: ApiCallInitialRequest[], dataByRequesterAddress: RequesterData): ApiCallRequest[] {
  return requests.reduce((acc, request) => {
    const data = dataByRequesterAddress[request.requesterAddress];

    if (!data) {
      const message = `Unable to find wallet data for Request ID:${request.requestId}`;
      logger.logProviderJSON(state.config.name, 'ERROR', message);

      const invalidatedRequest = {
        ...request,
        valid: false,
        errorCode: ApiRequestErrorCode.RequesterDataNotFound,
        requesterId: '',
        walletIndex: -1,
        walletAddress: '',
        walletBalance: ethereum.weiToBigNumber('0'),
        walletMinimumBalance: ethereum.weiToBigNumber('0'),
      };
      return [...acc, invalidatedRequest];
    }

    const updatedRequest = {
      ...request,
      requesterId: data.requesterId,
      walletIndex: data.walletIndex,
      walletAddress: data.walletAddress,
      walletBalance: data.walletBalance,
      walletMinimumBalance: data.walletMinimumBalance,
    };
    return [...acc, updatedRequest];
  }, []);
}
