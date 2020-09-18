import { ethers } from 'ethers';
import chunk from 'lodash/chunk';
import flatMap from 'lodash/flatMap';
import isEmpty from 'lodash/isEmpty';
import uniqBy from 'lodash/uniqBy';
import { Convenience } from '../contracts';
import * as logger from '../../utils/logger';
import { go, retryOperation } from '../../utils/promise-utils';
import { ApiCall, AuthorizationByEndpointId, ClientRequest, LogsErrorData, RequestStatus } from '../../../types';

interface FetchOptions {
  address: string;
  provider: ethers.providers.JsonRpcProvider;
}

interface AuthorizationStatus {
  authorized: boolean;
  endpointId: string;
  requesterAddress: string;
}

async function fetchAuthorizationStatuses(
  convenience: ethers.Contract,
  apiCalls: ClientRequest<ApiCall>[]
): Promise<LogsErrorData<AuthorizationStatus[]>> {
  // Ordering must remain the same when mapping these two arrays
  const endpointIds = apiCalls.map((a) => a.endpointId);
  const requesters = apiCalls.map((a) => a.requesterAddress);

  const contractCall = () => convenience.checkAuthorizationStatuses(endpointIds, requesters);
  const retryableContractCall = retryOperation(2, contractCall, { timeouts: [4000, 4000] }) as Promise<any>;

  const [err, data] = await go(retryableContractCall);
  if (err || !data) {
    const log = logger.pend('ERROR', 'Failed to fetch authorization details', err);
    return [[log], null, []];
  }

  const authorizations = apiCalls.reduce((acc, apiCall, index) => {
    const status: AuthorizationStatus = {
      endpointId: apiCall.endpointId!,
      requesterAddress: apiCall.requesterAddress,
      authorized: data[index],
    };
    return [...acc, status];
  }, []);

  return [[], null, authorizations];
}

export async function fetch(
  apiCalls: ClientRequest<ApiCall>[],
  fetchOptions: FetchOptions
): Promise<LogsErrorData<AuthorizationByEndpointId>> {
  // If an API call has a templateId but the template failed to load, then we cannot process
  // that request. These requests will be marked as blocked.
  const pendingApiCalls = apiCalls.filter((a) => a.status === RequestStatus.Pending);
  if (isEmpty(pendingApiCalls)) {
    return [[], null, {}];
  }

  // Remove duplicate API calls with the same endpoint ID and requester address
  const uniquePairs = uniqBy(pendingApiCalls, (a) => `${a.endpointId}-${a.requesterAddress}`);

  // Request groups of 10 at a time
  const groupedPairs = chunk(uniquePairs, 10);

  // Create an instance of the contract that we can re-use
  const convenience = new ethers.Contract(fetchOptions.address, Convenience.ABI, fetchOptions.provider);

  // Fetch all authorization statuses in parallel
  const promises = groupedPairs.map((pairs) => fetchAuthorizationStatuses(convenience, pairs));

  const responses = await Promise.all(promises);
  const responseLogs = flatMap(responses, (r) => r[0]);
  const authorizationStatuses = flatMap(responses, (r) => r[2]);

  // Store each "authorization" against the endpointId so it can be easily looked up
  const authorizationsByEndpoint = authorizationStatuses.reduce((acc, authorization) => {
    const currentEndpointRequesters = acc[authorization.endpointId] || {};
    const requesterAuthorization = { [authorization.requesterAddress]: authorization.authorized };
    const updatedEnpointRequesters = { ...currentEndpointRequesters, ...requesterAuthorization };

    return { ...acc, [authorization.endpointId]: updatedEnpointRequesters };
  }, {});

  return [responseLogs, null, authorizationsByEndpoint];
}
