import * as adapter from '@airnode/adapter';
import { OIS, SecuritySchemeSecret } from '@airnode/ois';
import { getReservedParameters, RESERVED_PARAMETERS } from '../adapters/http/parameters';
import { getConfigSecret } from '../config';
import { API_CALL_TIMEOUT, API_CALL_TOTAL_TIMEOUT } from '../constants';
import * as logger from '../logger';
import { AggregatedApiCall, ApiCallResponse, Config, LogsData, RequestErrorCode } from '../types';
import { removeKeys } from '../utils/object-utils';
import { go, retryOnTimeout } from '../utils/promise-utils';

function buildMetadataParameters(
  aggregatedApiCall: AggregatedApiCall,
  reservedParameters: adapter.ReservedParameters
): adapter.Parameters {
  switch (reservedParameters._relay_metadata?.toLowerCase()) {
    case 'v1': {
      const metadataParametersV1: adapter.MetadataParametersV1 = {
        _airnode_provider_id: aggregatedApiCall.providerId,
        _airnode_client_address: aggregatedApiCall.clientAddress,
        _airnode_designated_wallet: aggregatedApiCall.designatedWallet,
        _airnode_endpoint_id: aggregatedApiCall.endpointId,
        _airnode_requester_index: aggregatedApiCall.requesterIndex,
        _airnode_request_id: aggregatedApiCall.id,
        // In pre-alpha the requests events emitted by Airnode.sol do not
        // include the chainId, therefore we cannot map chain information of
        // request with the chain configured for the current provider
        _airnode_chain_id: 'N/A',
        _airnode_chain_type: 'N/A',
        _airnode_airnode: 'N/A',
      };
      return metadataParametersV1;
    }
    default:
      return {};
  }
}

function buildSecuritySchemeSecrets(ois: OIS): SecuritySchemeSecret[] {
  const securitySchemeNames = Object.keys(ois.apiSpecifications.components.securitySchemes);
  const securitySchemeSecrets = securitySchemeNames.map((securitySchemeName) => {
    const value = getConfigSecret(ois.title, securitySchemeName) || '';
    return { securitySchemeName, value } as SecuritySchemeSecret;
  });
  return securitySchemeSecrets;
}

function buildOptions(
  ois: OIS,
  aggregatedApiCall: AggregatedApiCall,
  reservedParameters: adapter.ReservedParameters
): adapter.BuildRequestOptions {
  // Include airnode metadata based on _relay_metadata version number
  const metadataParameters: adapter.Parameters = buildMetadataParameters(aggregatedApiCall, reservedParameters);

  // Don't submit the reserved parameters to the API
  const sanitizedParameters: adapter.Parameters = removeKeys(aggregatedApiCall.parameters || {}, RESERVED_PARAMETERS);

  // Fetch secrets and build a list of security schemes
  const securitySchemeSecrets = buildSecuritySchemeSecrets(ois);

  return {
    endpointName: aggregatedApiCall.endpointName!,
    parameters: sanitizedParameters,
    metadataParameters,
    ois,
    securitySchemeSecrets,
  };
}

export async function callApi(
  config: Config,
  aggregatedApiCall: AggregatedApiCall
): Promise<LogsData<ApiCallResponse>> {
  const { endpointName, oisTitle } = aggregatedApiCall;
  const ois = config.ois.find((o) => o.title === oisTitle)!;
  const endpoint = ois.endpoints.find((e) => e.name === endpointName)!;

  // Check before making the API call in case the parameters are missing
  const reservedParameters = getReservedParameters(endpoint, aggregatedApiCall.parameters || {});
  if (!reservedParameters._type) {
    const log = logger.pend('ERROR', `No '_type' parameter was found for Endpoint:${endpoint.name}, OIS:${oisTitle}`);
    return [[log], { errorCode: RequestErrorCode.ReservedParametersInvalid }];
  }

  const options: adapter.BuildRequestOptions = buildOptions(
    ois,
    aggregatedApiCall,
    reservedParameters as adapter.ReservedParameters
  );

  // Each API call is allowed API_CALL_TIMEOUT ms to complete, before it is retried until the
  // maximum timeout is reached.
  const adapterConfig: adapter.Config = { timeout: API_CALL_TIMEOUT };

  // If the request times out, we attempt to call the API again. Any other errors will not result in retries
  const retryableCall = retryOnTimeout(API_CALL_TOTAL_TIMEOUT, () =>
    adapter.buildAndExecuteRequest(options, adapterConfig)
  ) as Promise<any>;

  const [err, res] = await go(retryableCall);
  if (err) {
    const log = logger.pend('ERROR', `Failed to call Endpoint:${aggregatedApiCall.endpointName}`, err);
    return [[log], { errorCode: RequestErrorCode.ApiCallFailed }];
  }

  try {
    const extracted = adapter.extractAndEncodeResponse(res.data, reservedParameters as adapter.ReservedParameters);
    return [[], { value: extracted.encodedValue }];
  } catch (e) {
    const data = JSON.stringify(res?.data || {});
    const log = logger.pend('ERROR', `Unable to find response value from ${data}. Path: ${reservedParameters._path}`);
    return [[log], { errorCode: RequestErrorCode.ResponseValueNotFound }];
  }
}
