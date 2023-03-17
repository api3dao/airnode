import { ethers } from 'ethers';
import chunk from 'lodash/chunk';
import flatMap from 'lodash/flatMap';
import isEmpty from 'lodash/isEmpty';
import isNil from 'lodash/isNil';
import { logger } from '@api3/airnode-utilities';
import { go } from '@api3/promise-utils';
import { RequesterAuthorizerWithErc721, RequesterAuthorizerWithErc721Factory } from '@api3/airnode-protocol';
import { ApiCall, AuthorizationByRequestId, Request, LogsData } from '../../types';
import { CONVENIENCE_BATCH_SIZE, BLOCKCHAIN_CALL_ATTEMPT_TIMEOUT } from '../../constants';
import { AirnodeRrpV0, AirnodeRrpV0Factory } from '../contracts';
import { Erc721s, ChainAuthorizations, RequesterEndpointAuthorizers } from '../../config';

export interface FetchOptions {
  readonly airnodeAddress: string;
  readonly authorizations: ChainAuthorizations;
  readonly provider: ethers.providers.JsonRpcProvider;
}

export interface AirnodeRrpFetchOptions extends FetchOptions {
  readonly type: 'airnodeRrp';
  readonly airnodeRrpAddress: string;
  readonly requesterEndpointAuthorizers: RequesterEndpointAuthorizers;
}

export interface Erc721FetchOptions extends FetchOptions {
  readonly type: 'erc721';
  readonly chainId: string;
  readonly erc721s: Erc721s;
  readonly RequesterAuthorizerWithErc721Address: string;
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

  const goAuthorized = await go(contractCall, { retries: 1, attemptTimeoutMs: BLOCKCHAIN_CALL_ATTEMPT_TIMEOUT });
  if (!goAuthorized.success) {
    const log = logger.pend(
      'ERROR',
      `Failed to fetch requesterEndpointAuthorizers authorization using checkAuthorizationStatus for Request:${apiCall.id}`,
      goAuthorized.error
    );
    return [[log], null];
  }
  if (isNil(goAuthorized.data)) {
    const log = logger.pend(
      'ERROR',
      `Failed to fetch requesterEndpointAuthorizers authorization using checkAuthorizationStatus for Request:${apiCall.id}`
    );
    return [[log], null];
  }
  const successLog = logger.pend(
    'INFO',
    `Fetched requesterEndpointAuthorizers authorization using checkAuthorizationStatus for Request:${apiCall.id}`
  );
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

  const goData = await go(contractCall, { retries: 1, attemptTimeoutMs: BLOCKCHAIN_CALL_ATTEMPT_TIMEOUT });
  if (!goData.success) {
    const groupLog = logger.pend(
      'WARN',
      'Failed to fetch requesterEndpointAuthorizers authorization using checkAuthorizationStatuses. ' +
        'Falling back to fetching authorizations individually.',
      goData.error
    );

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

export function decodeMulticall(
  requesterAuthorizerWithErc721: RequesterAuthorizerWithErc721,
  data: string[]
): boolean[] {
  return data.map((d) => requesterAuthorizerWithErc721.interface.decodeFunctionResult('isAuthorized', d)[0]);
}

/**
 * Returns authorization statuses by id in their requested order from the decoded multicall boolean array
 */
export function applyErc721Authorizations(
  apiCalls: Request<ApiCall>[],
  erc721s: Erc721s,
  authorizations: boolean[]
): AuthorizationByRequestId {
  return apiCalls.reduce((acc, apiCall, index) => {
    // Erc721s as an array requires slicing the authorizations array to get each api call's authorizations
    const resultIndex = index * erc721s.length;
    // The requester is authorized if authorized by any Erc721
    const authorized = authorizations.slice(resultIndex, resultIndex + erc721s.length).some((r) => r);
    return { ...acc, [apiCall.id]: authorized };
  }, {});
}

async function fetchErc721AuthorizationStatuses(
  requesterAuthorizerWithErc721: RequesterAuthorizerWithErc721,
  airnodeAddress: string,
  erc721s: Erc721s,
  chainId: string,
  apiCalls: Request<ApiCall>[]
): Promise<LogsData<AuthorizationByRequestId | null>> {
  // Batch isAuthorized calls using multicall.
  const calldata = apiCalls.flatMap((apiCall) => {
    return erc721s.map((erc721) => {
      return requesterAuthorizerWithErc721.interface.encodeFunctionData('isAuthorized', [
        airnodeAddress,
        chainId,
        apiCall.requesterAddress,
        erc721,
      ]);
    });
  });
  const contractCall = () => requesterAuthorizerWithErc721.callStatic.multicall(calldata);
  const goData = await go(contractCall, { retries: 1, attemptTimeoutMs: BLOCKCHAIN_CALL_ATTEMPT_TIMEOUT });

  if (!goData.success) {
    const groupLog = logger.pend('ERROR', 'Failed to fetch Erc721 batch authorizations', goData.error);

    return [[groupLog], null];
  }
  const decodedMulticall = decodeMulticall(requesterAuthorizerWithErc721, goData.data);
  const authorizationsById = applyErc721Authorizations(apiCalls, erc721s, decodedMulticall);

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
  fetchOptions: AirnodeRrpFetchOptions | Erc721FetchOptions
): Promise<LogsData<AuthorizationByRequestId>> {
  // If there are no pending API calls then there is no need to make an ETH call
  if (isEmpty(apiCalls)) {
    return [[], {}];
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

  let promises: Promise<LogsData<AuthorizationByRequestId | null>>[];
  switch (fetchOptions.type) {
    case 'airnodeRrp':
      // Fetch all authorization statuses in parallel
      promises = groupedPairs.map((pairs) =>
        fetchAuthorizationStatuses(
          AirnodeRrpV0Factory.connect(fetchOptions.airnodeRrpAddress, fetchOptions.provider),
          fetchOptions.requesterEndpointAuthorizers,
          fetchOptions.airnodeAddress,
          pairs
        )
      );
      break;
    case 'erc721':
      promises = groupedPairs.map((pairs) =>
        fetchErc721AuthorizationStatuses(
          RequesterAuthorizerWithErc721Factory.connect(
            fetchOptions.RequesterAuthorizerWithErc721Address,
            fetchOptions.provider
          ),
          fetchOptions.airnodeAddress,
          fetchOptions.erc721s,
          fetchOptions.chainId,
          pairs
        )
      );
      break;
  }

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
