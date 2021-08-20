import { ethers } from 'ethers';
import chunk from 'lodash/chunk';
import flatMap from 'lodash/flatMap';
import isEmpty from 'lodash/isEmpty';
import isNil from 'lodash/isNil';
import * as logger from '../../logger';
import { go } from '../../utils/promise-utils';
import { ApiCall, AuthorizationByRequestId, ClientRequest, LogsData, RequestStatus } from '../../types';
import { CONVENIENCE_BATCH_SIZE, DEFAULT_RETRY_TIMEOUT_MS } from '../../constants';
import { AirnodeRrp, AirnodeRrpFactory } from '../contracts';

interface FetchOptions {
  readonly airnodeAddress: string;
  readonly airnodeRrpAddress: string;
  readonly provider: ethers.providers.JsonRpcProvider;
}

export async function fetchAuthorizationStatus(
  airnodeRrp: AirnodeRrp,
  airnodeAddress: string,
  apiCall: ClientRequest<ApiCall>
): Promise<LogsData<boolean | null>> {
  const contractCall = () =>
    airnodeRrp.checkAuthorizationStatus(
      airnodeAddress,
      apiCall.id,
      // TODO: make sure endpointId is not null
      apiCall.endpointId!,
      apiCall.requesterIndex,
      apiCall.designatedWallet,
      apiCall.clientAddress
    );

  const [err, authorized] = await go(contractCall, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
  if (err || isNil(authorized)) {
    const log = logger.pend('ERROR', `Failed to fetch authorization details for Request:${apiCall.id}`, err);
    return [[log], null];
  }
  const successLog = logger.pend('INFO', `Fetched authorization status for Request:${apiCall.id}`);
  return [[successLog], authorized];
}

async function fetchAuthorizationStatuses(
  airnodeRrp: AirnodeRrp,
  airnodeAddress: string,
  apiCalls: ClientRequest<ApiCall>[]
): Promise<LogsData<AuthorizationByRequestId | null>> {
  // Ordering must remain the same when mapping these two arrays
  const requestIds = apiCalls.map((a) => a.id);
  const endpointIds = apiCalls.map((a) => a.endpointId);
  const requesterIndices = apiCalls.map((a) => a.requesterIndex);
  const designatedWallets = apiCalls.map((a) => a.designatedWallet);
  const clientAddresses = apiCalls.map((a) => a.clientAddress);

  const contractCall = () =>
    airnodeRrp.checkAuthorizationStatuses(
      airnodeAddress,
      requestIds,
      // TODO: make sure all endpointIds are non null
      endpointIds as string[],
      requesterIndices,
      designatedWallets,
      clientAddresses
    );

  const [err, data] = await go(contractCall, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
  if (err || !data) {
    const groupLog = logger.pend('ERROR', 'Failed to fetch group authorization details', err);

    // If the authorization batch cannot be fetched, fallback to fetching authorizations individually
    const promises: Promise<LogsData<{ readonly id: string; readonly authorized: boolean | null }>>[] = apiCalls.map(
      async (apiCall) => {
        const [logs, authorized] = await fetchAuthorizationStatus(airnodeRrp, airnodeAddress, apiCall);
        const data = { id: apiCall.id, authorized };
        const result: LogsData<{ readonly id: string; readonly authorized: boolean | null }> = [logs, data];
        return result;
      }
    );
    const results = await Promise.all(promises);
    const allLogs = flatMap(results, (r) => r[0]);
    const authorizationsWithId = results.filter((r) => !isNil(r[1].authorized)).map((r) => r[1]);
    const authorizationsById: { readonly [id: string]: boolean } = authorizationsWithId.reduce((acc, status) => {
      return { ...acc, [status.id]: status.authorized };
    }, {});

    return [[groupLog, ...allLogs], authorizationsById];
  }

  // Authorization statuses are returned in the same order that they are requested.
  const authorizationsById = apiCalls.reduce((acc, apiCall, index) => {
    return { ...acc, [apiCall.id]: data[index] };
  }, {});

  return [[], authorizationsById];
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
  const groupedPairs = chunk(pendingApiCalls, CONVENIENCE_BATCH_SIZE);

  // Create an instance of the contract that we can re-use
  const airnodeRrp = AirnodeRrpFactory.connect(fetchOptions.airnodeRrpAddress, fetchOptions.provider);

  // Fetch all authorization statuses in parallel
  const promises = groupedPairs.map((pairs) =>
    fetchAuthorizationStatuses(airnodeRrp, fetchOptions.airnodeAddress, pairs)
  );

  const responses = await Promise.all(promises);
  const responseLogs = flatMap(responses, (r) => r[0]);
  const authorizationStatuses = responses.map((r) => r[1]);

  const successfulResults = authorizationStatuses.filter((r) => !!r) as AuthorizationByRequestId[];

  // Merge all successful results into a single object
  const combinedResults = Object.assign({}, ...successfulResults) as AuthorizationByRequestId;

  return [responseLogs, combinedResults];
}
