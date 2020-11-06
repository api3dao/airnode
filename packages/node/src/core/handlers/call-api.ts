import * as adapter from '@airnode/adapter';
import { OIS, SecurityScheme } from '@airnode/ois';
import { go, retryOnTimeout } from '../utils/promise-utils';
import { removeKeys } from '../utils/object-utils';
import { getConfigSecret } from '../config';
import * as logger from '../logger';
import { getResponseParameters, RESERVED_PARAMETERS } from '../adapters/http/parameters';
import { validateAggregatedApiCall } from '../adapters/http/preprocessing';
import { AggregatedApiCall, ApiCallResponse, Config, LogsData, RequestErrorCode } from '../../types';

// Each API call is allowed 20 seconds to complete, before it is retried until the
// maximum timeout is reached.
const TOTAL_TIMEOUT = 29_000;
const API_CALL_TIMEOUT = 20_000;

function buildOptions(ois: OIS, aggregatedApiCall: AggregatedApiCall): adapter.Options {
  // Don't submit the reserved parameters to the API
  const parameters = removeKeys(aggregatedApiCall.parameters || {}, RESERVED_PARAMETERS);

  // Fetch secrets and build a list of security schemes
  const securitySchemeNames = Object.keys(ois.apiSpecifications.components.securitySchemes);
  const securitySchemes = securitySchemeNames.map((securitySchemeName) => {
    const securityScheme = ois.apiSpecifications.components.securitySchemes[securitySchemeName];
    const value = getConfigSecret(ois.title, securitySchemeName);
    return { ...securityScheme, securitySchemeName, value } as SecurityScheme;
  });

  return {
    endpointName: aggregatedApiCall.endpointName!,
    parameters,
    ois,
    securitySchemes,
  };
}

export async function callApi(
  config: Config,
  aggregatedApiCall: AggregatedApiCall
): Promise<LogsData<ApiCallResponse>> {
  const [validationLogs, validatedCall] = validateAggregatedApiCall(config, aggregatedApiCall);

  // An invalid API call should never reach this point, but just in case it does
  if (validatedCall.errorCode) {
    return [[...validationLogs], { errorCode: validatedCall.errorCode }];
  }

  const { endpointName, oisTitle } = aggregatedApiCall;
  const ois = config.ois.find((o) => o.title === oisTitle)!;
  const endpoint = ois.endpoints.find((e) => e.name === endpointName)!;

  // Check before making the API call in case the parameters are missing
  const responseParameters = getResponseParameters(endpoint, aggregatedApiCall.parameters || {});
  if (!responseParameters._type) {
    const log = logger.pend('ERROR', `No '_type' parameter was found for Endpoint:${endpoint.name}, OIS:${oisTitle}`);
    return [[log], { errorCode: RequestErrorCode.InvalidResponseParameters }];
  }

  const options = buildOptions(ois, validatedCall);
  const adapterConfig: adapter.Config = { timeout: API_CALL_TIMEOUT };

  // If the request times out, we attempt to call the API again. Any other errors will not result in retries
  const retryableCall = retryOnTimeout(TOTAL_TIMEOUT, () =>
    adapter.buildAndExecuteRequest(options, adapterConfig)
  ) as Promise<any>;

  const [err, res] = await go(retryableCall);
  if (err) {
    const log = logger.pend('ERROR', `Failed to call Endpoint:${validatedCall.endpointName}`, err);
    return [[...validationLogs, log], { errorCode: RequestErrorCode.ApiCallFailed }];
  }

  try {
    const extracted = adapter.extractAndEncodeResponse(res.data, responseParameters as adapter.ResponseParameters);
    return [[...validationLogs], { value: extracted.encodedValue }];
  } catch (e) {
    const data = JSON.stringify(res?.data || {});
    const log = logger.pend('ERROR', `Unable to find response value from ${data}. Path: ${responseParameters._path}`);
    return [[...validationLogs, log], { errorCode: RequestErrorCode.ResponseValueNotFound }];
  }
}
