import { ethers } from 'ethers';
import uniq from 'lodash/uniq';
import { config } from '../../../config';
import { Convenience } from '../../../ethereum/contracts';
import { ApiCallRequest, ProviderState } from '../../../../types';
import { goTimeout, retryOperation } from '../../../utils/promise-utils';
import * as logger from '../../../utils/logger';
import * as model from './model';

const TIMEOUT = 5000;

// Alias types
type NewApiCallRequest = model.NewApiCallRequest;

interface RequesterData {
  requesterAddress: string;
  data: any;
}

async function fetchRequesterData(state: ProviderState, requesterAddress: string): Promise<RequesterData | null> {
  const { providerId } = config.nodeSettings;
  const contract = new ethers.Contract(Convenience.addresses[state.config.chainId], Convenience.ABI, state.provider);
  const contractCall = () => contract.getDataWithClientAddress(providerId, requesterAddress) as Promise<any>;
  const retryableContractCall = retryOperation(2, contractCall, { timeouts: [4000, 4000] });

  const [err, data] = await goTimeout(TIMEOUT, retryableContractCall);
  // If we fail to fetch templates, the linked requests will be discarded and retried
  // on the next run
  if (err || !data) {
    logger.logProviderError(state.config.name, 'Failed to fetch requester details', err);
    return null;
  }
  return { requesterAddress, data };
}

export async function fetch(state: ProviderState, apiCallRequests: NewApiCallRequest[]): Promise<RequesterData[]> {
  // Calls for requests that are already invalid are wasted
  const validApiRequests = apiCallRequests.filter((r) => r.valid);

  // Get a unique list of all requester addresses
  const requesterAddresses = uniq(validApiRequests.map((r) => r.requesterAddress));

  // Fetch all unique requester details in parallel
  const promises = requesterAddresses.map((address) => fetchRequesterData(state, address));

  const results = await Promise.all(promises);

  const successfulResults = results.filter((r) => !!r) as RequesterData[];
  return successfulResults;
}

export function apply(apiCallRequests: NewApiCallRequest[], requesterData: RequesterData[]): ApiCallRequest[] {
  return requesterData.reduce((acc, requester) => {
    const { data, requesterAddress } = requester;

    const requests = apiCallRequests.filter((r) => r.requesterAddress === requesterAddress);

    const updatedRequests = requests.map((request) => ({
      ...request,
      requesterId: data.requesterId,
      walletIndex: data.walletIndex,
      walletAddress: data.walletAddress,
      walletBalance: data.walletBalance,
      walletMinimumBalance: data.walletMinimumBalance,
    }));

    return [...acc, ...updatedRequests];
  }, []);
}
