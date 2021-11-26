import * as adapter from '@api3/airnode-adapter';
import { OIS } from '@api3/airnode-ois';
import { getReservedParameters, RESERVED_PARAMETERS } from '../adapters/http/parameters';
import { API_CALL_TIMEOUT, API_CALL_TOTAL_TIMEOUT } from '../constants';
import * as logger from '../logger';
import { AggregatedApiCall, ApiCallResponse, ChainConfig, Config, LogsData, RequestErrorMessage } from '../types';
import { removeKeys, removeKey } from '../utils/object-utils';
import { go, retryOnTimeout } from '../utils/promise-utils';

function buildOptions(
  chain: ChainConfig,
  ois: OIS,
  aggregatedApiCall: AggregatedApiCall,
  reservedParameters: adapter.ReservedParameters,
  apiCredentials: adapter.ApiCredentials[]
): adapter.BuildRequestOptions {
  // Don't submit the reserved parameters to the API
  const sanitizedParameters: adapter.Parameters = removeKeys(aggregatedApiCall.parameters || {}, RESERVED_PARAMETERS);

  return {
    endpointName: aggregatedApiCall.endpointName!,
    parameters: sanitizedParameters,
    ois,
    apiCredentials,
    metadata: {
      airnodeAddress: aggregatedApiCall.airnodeAddress,
      requesterAddress: aggregatedApiCall.requesterAddress,
      sponsorAddress: aggregatedApiCall.sponsorAddress,
      sponsorWalletAddress: aggregatedApiCall.sponsorWalletAddress,
      endpointId: aggregatedApiCall.endpointId,
      requestId: aggregatedApiCall.id,
      chainId: aggregatedApiCall.chainId,
      chainType: chain.type,
      airnodeRrpAddress: chain.contracts.AirnodeRrp,
    },
  };
}

export interface ApiCallOptions {
  readonly forTestingGateway?: boolean;
}

export interface CallApiPayload {
  readonly config: Config;
  readonly aggregatedApiCall: AggregatedApiCall;
  readonly apiCallOptions: ApiCallOptions;
}

export async function callApi(payload: CallApiPayload): Promise<LogsData<ApiCallResponse>> {
  const { config, aggregatedApiCall, apiCallOptions } = payload;

  const { chainId, endpointName, oisTitle } = aggregatedApiCall;
  const chain = config.chains.find((c) => c.id === chainId)!;
  const ois = config.ois.find((o) => o.title === oisTitle)!;
  const endpoint = ois.endpoints.find((e) => e.name === endpointName)!;
  const apiCredentials = config.apiCredentials
    .filter((c) => c.oisTitle === oisTitle)
    .map((c) => removeKey(c, 'oisTitle'));

  // Check before making the API call in case the parameters are missing
  const reservedParameters = getReservedParameters(endpoint, aggregatedApiCall.parameters || {});
  if (!reservedParameters._type) {
    const log = logger.pend('ERROR', `No '_type' parameter was found for Endpoint:${endpoint.name}, OIS:${oisTitle}`);
    return [
      [log],
      {
        errorMessage: `${RequestErrorMessage.ReservedParametersInvalid}: _type is missing for endpoint ${endpoint.name}`,
      },
    ];
  }

  const options: adapter.BuildRequestOptions = buildOptions(
    chain,
    ois,
    aggregatedApiCall,
    reservedParameters as adapter.ReservedParameters,
    apiCredentials as adapter.ApiCredentials[]
  );

  // Each API call is allowed API_CALL_TIMEOUT ms to complete, before it is retried until the
  // maximum timeout is reached.
  const adapterConfig: adapter.Config = { timeout: API_CALL_TIMEOUT };
  // If the request times out, we attempt to call the API again. Any other errors will not result in retries
  const retryableCall = retryOnTimeout(API_CALL_TOTAL_TIMEOUT, () =>
    adapter.buildAndExecuteRequest(options, adapterConfig)
  );

  const [err, res] = await go(() => retryableCall);
  if (err) {
    const log = logger.pend('ERROR', `Failed to call Endpoint:${aggregatedApiCall.endpointName}`, err);
    return [[log], { errorMessage: `${RequestErrorMessage.ApiCallFailed} with error: ${err.message}` }];
  }

  // eslint-disable-next-line functional/no-try-statement
  try {
    const response = adapter.extractAndEncodeResponse(res?.data, reservedParameters as adapter.ReservedParameters);
    const value = apiCallOptions?.forTestingGateway ? JSON.stringify(response) : response.encodedValue;
    return [[], { value }];
  } catch (e) {
    const data = JSON.stringify(res?.data || {});
    const log = logger.pend('ERROR', `Unable to find response value from ${data}. Path: ${reservedParameters._path}`);
    return [[log], { errorMessage: RequestErrorMessage.ResponseValueNotFound }];
  }
}
