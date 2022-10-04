import { ethers } from 'ethers';
import chunk from 'lodash/chunk';
import flatMap from 'lodash/flatMap';
import isEmpty from 'lodash/isEmpty';
import isNil from 'lodash/isNil';
import { logger } from '@api3/airnode-utilities';
import { go } from '@api3/promise-utils';
import { ApiCall, AuthorizationByRequestId, Request, LogsData } from '../../types';
import { CONVENIENCE_BATCH_SIZE, DEFAULT_RETRY_TIMEOUT_MS } from '../../constants';
import { AirnodeRrpV0, AirnodeRrpV0Factory } from '../contracts';
import { RequesterEndpointAuthorizers, ChainAuthorizations } from '../../config';

export interface FetchOptions {
  readonly requesterEndpointAuthorizers: RequesterEndpointAuthorizers;
  readonly authorizations: ChainAuthorizations;
  readonly airnodeAddress: string;
  readonly airnodeRrpAddress: string;
  readonly provider: ethers.providers.JsonRpcProvider;
}

export async function fetchAuthorizationStatus(
  airnodeRrp: AirnodeRrpV0,
  requesterEndpointAuthorizers: RequesterEndpointAuthorizers,
  airnodeAddress: string,
  apiCall: Request<ApiCall>
): Promise<LogsData<boolean | null>> {
  const contractCall = (): Promise<boolean> =>
    airnodeRrp.checkAuthorizationStatus(
      requesterEndpointAuthorizers,
      airnodeAddress,
      apiCall.id,
      // TODO: make sure endpointId is not null
      apiCall.endpointId!,
      apiCall.sponsorAddress,
      apiCall.requesterAddress
    );

  const goAuthorized = await go(contractCall, { retries: 1, attemptTimeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
  if (!goAuthorized.success) {
    const log = logger.pend(
      'ERROR',
      `Failed to fetch authorization details for Request:${apiCall.id}`,
      goAuthorized.error
    );
    return [[log], null];
  }
  if (isNil(goAuthorized.data)) {
    const log = logger.pend('ERROR', `Failed to fetch authorization details for Request:${apiCall.id}`);
    return [[log], null];
  }
  const successLog = logger.pend('INFO', `Fetched authorization status for Request:${apiCall.id}`);
  return [[successLog], goAuthorized.data];
}

async function fetchAuthorizationStatuses(
  airnodeRrp: AirnodeRrpV0,
  requesterEndpointAuthorizers: RequesterEndpointAuthorizers,
  airnodeAddress: string,
  apiCalls: Request<ApiCall>[]
): Promise<LogsData<AuthorizationByRequestId | null>> {
  // Ordering must remain the same when mapping these two arrays
  const requestIds = apiCalls.map((a) => a.id);
  const endpointIds = apiCalls.map((a) => a.endpointId);
  const sponsorAddresses = apiCalls.map((a) => a.sponsorAddress);
  const requesterAddresses = apiCalls.map((a) => a.requesterAddress);

  const contractCall = (): Promise<boolean[]> =>
    airnodeRrp.checkAuthorizationStatuses(
      requesterEndpointAuthorizers,
      airnodeAddress,
      requestIds,
      // TODO: make sure all endpointIds are non null
      endpointIds as string[],
      sponsorAddresses,
      requesterAddresses
    );

  const goData = await go(contractCall, { retries: 1, attemptTimeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
  if (!goData.success) {
    const groupLog = logger.pend('ERROR', 'Failed to fetch group authorization details', goData.error);

    // If the authorization batch cannot be fetched, fallback to fetching authorizations individually
    const promises: Promise<LogsData<{ readonly id: string; readonly authorized: boolean | null }>>[] = apiCalls.map(
      async (apiCall) => {
        const [logs, authorized] = await fetchAuthorizationStatus(
          airnodeRrp,
          requesterEndpointAuthorizers,
          airnodeAddress,
          apiCall
        );
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
    return { ...acc, [apiCall.id]: goData.data[index] };
  }, {});

  return [[], authorizationsById];
}

export const checkConfigAuthorizations = (apiCalls: Request<ApiCall>[], fetchOptions: FetchOptions) => {
  return apiCalls.reduce((acc: AuthorizationByRequestId, apiCall) => {
    // Check if an authorization is found in config for the apiCall endpointId
    const configAuthorization = fetchOptions.authorizations.requesterEndpointAuthorizations[apiCall.endpointId!];

    if (configAuthorization) {
      const configAuthorizationIncludesRequesterAddress = configAuthorization.includes(apiCall.requesterAddress);

      // Set the authorization status to true if the requester address is included for the endpointId
      if (configAuthorizationIncludesRequesterAddress) return { ...acc, [apiCall.id]: true };
    }

    return acc;
  }, {});
};

export async function fetch(
  apiCalls: Request<ApiCall>[],
  fetchOptions: FetchOptions
): Promise<LogsData<AuthorizationByRequestId>> {
  // If there are no pending API calls then there is no need to make an ETH call
  if (isEmpty(apiCalls)) {
    return [[], {}];
  }

  // If there are no authorizer contracts then endpoint is public
  if (isEmpty(fetchOptions.requesterEndpointAuthorizers)) {
    const authorizationByRequestIds = apiCalls.map((pendingApiCall) => ({
      [pendingApiCall.id]: true,
    }));
    return [[], Object.assign({}, ...authorizationByRequestIds) as AuthorizationByRequestId];
  }

  // Skip fetching authorization statuses if found in config for a specific authorization type
  // and requester address
  const configAuthorizationsByRequestId = checkConfigAuthorizations(apiCalls, fetchOptions);

  // Filter apiCalls for which a valid authorization was found in config
  const configAuthorizationRequestIds = Object.keys(configAuthorizationsByRequestId);
  const apiCallsToFetchAuthorizationStatus = apiCalls.filter(
    (apiCall) => !configAuthorizationRequestIds.includes(apiCall.id)
  );

  // Request groups of 10 at a time
  const groupedPairs = chunk(apiCallsToFetchAuthorizationStatus, CONVENIENCE_BATCH_SIZE);

  // Create an instance of the contract that we can re-use
  const airnodeRrp = AirnodeRrpV0Factory.connect(fetchOptions.airnodeRrpAddress, fetchOptions.provider);

  // Fetch all authorization statuses in parallel
  const promises = groupedPairs.map((pairs) =>
    fetchAuthorizationStatuses(
      airnodeRrp,
      fetchOptions.requesterEndpointAuthorizers,
      fetchOptions.airnodeAddress,
      pairs
    )
  );

  const responses = await Promise.all(promises);
  const responseLogs = flatMap(responses, (r) => r[0]);
  const authorizationStatuses = responses.map((r) => r[1]);

  const successfulResults = authorizationStatuses.filter((r) => !!r) as AuthorizationByRequestId[];

  // Merge all successful results into a single object
  const combinedResults = Object.assign(
    {},
    ...successfulResults,
    configAuthorizationsByRequestId
  ) as AuthorizationByRequestId;

  return [responseLogs, combinedResults];
}
