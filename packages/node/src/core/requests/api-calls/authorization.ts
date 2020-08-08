import { ethers } from 'ethers';
import chunk from 'lodash/chunk';
import flatten from 'lodash/flatten';
import uniqBy from 'lodash/uniqBy';
import * as ethereum from '../../ethereum';
import * as logger from '../../utils/logger';
import { go, retryOperation } from '../../utils/promise-utils';
import { ApiCall, ClientRequest, ProviderState } from '../../../types';

interface AuthorizationStatus {
  authorized: boolean;
  endpointId: string;
  requesterAddress: string;
}

async function fetchAuthorizationStatuses(
  state: ProviderState,
  apiCalls: ClientRequest<ApiCall>[]
): Promise<AuthorizationStatus[] | null> {
  const { Convenience } = ethereum.contracts;

  // Ordering must remain the same when mapping these two arrays
  const endpointIds = apiCalls.map((a) => a.endpointId);
  const requesters = apiCalls.map((a) => a.requesterAddress);

  const contract = new ethers.Contract(Convenience.addresses[state.config.chainId], Convenience.ABI, state.provider);
  const contractCall = () => contract.checkAuthorizationStatuses(endpointIds, requesters);
  const retryableContractCall = retryOperation(2, contractCall, { timeouts: [4000, 4000] }) as Promise<any>;

  const [err, data] = await go(retryableContractCall);
  if (err || !data) {
    logger.logProviderError(state.config.name, 'Failed to fetch authorization details', err);
    return null;
  }

  const authorizations = apiCalls.reduce((acc, apiCall, index) => {
    const status: AuthorizationStatus = {
      endpointId: apiCall.endpointId!,
      requesterAddress: apiCall.requesterAddress,
      authorized: data[index],
    };
    return [...acc, status];
  }, []);

  return authorizations;
}

export async function fetch(state: ProviderState, apiCalls: ClientRequest<ApiCall>[]) {
  // API Calls should always have an endpoint ID at this point, but filter just in case.
  const filteredApiCalls = apiCalls.filter((a) => !!a.endpointId);

  // Remove duplicate API calls with the same endpoint ID and requester address
  const uniquePairs = uniqBy(filteredApiCalls, (a) => `${a.endpointId}-${a.requesterAddress}`);

  // Request groups of 10 at a time
  const groupedPairs = chunk(uniquePairs, 10);

  // Fetch all authorization statuses in parallel
  const promises = groupedPairs.map((pairs) => fetchAuthorizationStatuses(state, pairs));

  const results = await Promise.all(promises);
  const successfulResults = flatten(results.filter((r) => !!r)) as AuthorizationStatus[];

  const authorizationsByEndpoint = successfulResults.reduce((acc, result) => {
    const currentEndpointRequesters = acc[result.endpointId] || {};
    const requesterAuthorization = { [result.requesterAddress]: result.authorized };
    const updatedEnpointRequesters = { ...currentEndpointRequesters, ...requesterAuthorization };

    return { ...acc, [result.endpointId]: updatedEnpointRequesters };
  }, {});

  return authorizationsByEndpoint;
}
