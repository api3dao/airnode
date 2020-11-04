import { ethers } from 'ethers';
import chunk from 'lodash/chunk';
import flatMap from 'lodash/flatMap';
import isEmpty from 'lodash/isEmpty';
import uniqBy from 'lodash/uniqBy';
import { Convenience } from '../contracts';
import * as logger from '../../logger';
import { go, retryOperation } from '../../utils/promise-utils';
import { ApiCall, AuthorizationByEndpointId, ClientRequest, LogsData, RequestStatus } from '../../../types';

interface FetchOptions {
  address: string;
  providerId: string;
  provider: ethers.providers.JsonRpcProvider;
}

interface AuthorizationStatus {
  authorized: boolean;
  endpointId: string;
  clientAddress: string;
}

async function fetchAuthorizationStatuses(
  convenience: ethers.Contract,
  providerId: string,
  apiCalls: ClientRequest<ApiCall>[]
): Promise<LogsData<AuthorizationStatus[]>> {
  // Ordering must remain the same when mapping these two arrays
  const requestIds = apiCalls.map((a) => a.id);
  const endpointIds = apiCalls.map((a) => a.endpointId);
  const requesterIndices = apiCalls.map((a) => a.requesterIndex);
  const designatedWallets = apiCalls.map((a) => a.designatedWallet);
  const clientAddresses = apiCalls.map((a) => a.clientAddress);

  const contractCall = () =>
    convenience.checkAuthorizationStatuses(
      providerId,
      requestIds,
      endpointIds,
      requesterIndices,
      designatedWallets,
      clientAddresses
    );
  const retryableContractCall = retryOperation(2, contractCall, { timeouts: [4000, 4000] }) as Promise<any>;

  const [err, data] = await go(retryableContractCall);
  if (err || !data) {
    const log = logger.pend('ERROR', 'Failed to fetch authorization details', err);
    return [[log], []];
  }

  // Authorization statuses are returned in the same order that they are requested.
  const authorizations = apiCalls.reduce((acc, apiCall, index) => {
    const status: AuthorizationStatus = {
      endpointId: apiCall.endpointId!,
      clientAddress: apiCall.clientAddress,
      authorized: data[index],
    };
    return [...acc, status];
  }, []);

  return [[], authorizations];
}

export async function fetch(
  apiCalls: ClientRequest<ApiCall>[],
  fetchOptions: FetchOptions
): Promise<LogsData<AuthorizationByEndpointId>> {
  // If an API call has a templateId but the template failed to load, then we cannot process
  // that request. These requests will be marked as blocked.
  const pendingApiCalls = apiCalls.filter((a) => a.status === RequestStatus.Pending);

  // If there are no pending API calls then there is no need to make an ETH call
  if (isEmpty(pendingApiCalls)) {
    return [[], {}];
  }

  // Remove duplicate API calls with the same endpoint ID and requester address
  const uniquePairs = uniqBy(pendingApiCalls, (a) => `${a.endpointId}-${a.clientAddress}`);

  // Request groups of 10 at a time
  const groupedPairs = chunk(uniquePairs, 10);

  // Create an instance of the contract that we can re-use
  const convenience = new ethers.Contract(fetchOptions.address, Convenience.ABI, fetchOptions.provider);

  // Fetch all authorization statuses in parallel
  const promises = groupedPairs.map((pairs) => fetchAuthorizationStatuses(convenience, fetchOptions.providerId, pairs));

  const responses = await Promise.all(promises);
  const responseLogs = flatMap(responses, (r) => r[0]);
  const authorizationStatuses = flatMap(responses, (r) => r[1]);

  // Store each "authorization" against the endpointId so it can be easily looked up
  const authorizationsByEndpoint = authorizationStatuses.reduce((acc, authorization) => {
    const currentEndpointRequesters = acc[authorization.endpointId] || {};
    const requesterAuthorization = { [authorization.clientAddress]: authorization.authorized };
    const updatedEnpointRequesters = { ...currentEndpointRequesters, ...requesterAuthorization };

    return { ...acc, [authorization.endpointId]: updatedEnpointRequesters };
  }, {});

  return [responseLogs, authorizationsByEndpoint];
}
