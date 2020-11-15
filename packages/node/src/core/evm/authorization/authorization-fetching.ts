import { ethers } from 'ethers';
import chunk from 'lodash/chunk';
import flatMap from 'lodash/flatMap';
import isEmpty from 'lodash/isEmpty';
import { Convenience } from '../contracts';
import * as logger from '../../logger';
import { go, retryOperation } from '../../utils/promise-utils';
import { ApiCall, AuthorizationByRequestId, ClientRequest, LogsData, RequestStatus } from '../../../types';

interface FetchOptions {
  convenienceAddress: string;
  providerId: string;
  provider: ethers.providers.JsonRpcProvider;
}

async function fetchAuthorizationStatuses(
  convenience: ethers.Contract,
  providerId: string,
  apiCalls: ClientRequest<ApiCall>[]
): Promise<LogsData<AuthorizationByRequestId | null>> {
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
    return [[log], null];
  }

  // Authorization statuses are returned in the same order that they are requested.
  const authorizations = apiCalls.reduce((acc, apiCall, index) => {
    return { ...acc, [apiCall.id]: data[index] };
  }, {});

  return [[], authorizations];
}

export async function fetch(
  apiCalls: ClientRequest<ApiCall>[],
  fetchOptions: FetchOptions
): Promise<LogsData<AuthorizationByRequestId>> {
  // If an API call has a templateId but the template failed to load, then we cannot process
  // that request. These requests will be marked as blocked.
  const pendingApiCalls = apiCalls.filter((a) => a.status === RequestStatus.Pending);

  // If there are no pending API calls then there is no need to make an ETH call
  if (isEmpty(pendingApiCalls)) {
    return [[], {}];
  }

  // Request groups of 10 at a time
  const groupedPairs = chunk(pendingApiCalls, 10);

  // Create an instance of the contract that we can re-use
  const convenience = new ethers.Contract(fetchOptions.convenienceAddress, Convenience.ABI, fetchOptions.provider);

  // Fetch all authorization statuses in parallel
  const promises = groupedPairs.map((pairs) => fetchAuthorizationStatuses(convenience, fetchOptions.providerId, pairs));

  const responses = await Promise.all(promises);
  const responseLogs = flatMap(responses, (r) => r[0]);
  const authorizationStatuses = responses.map((r) => r[1]);

  const successfulResults = authorizationStatuses.filter((r) => !!r) as AuthorizationByRequestId[];

  // Merge all successful results into a single object
  const combinedResults = Object.assign({}, ...successfulResults) as AuthorizationByRequestId;

  return [responseLogs, combinedResults];
}
