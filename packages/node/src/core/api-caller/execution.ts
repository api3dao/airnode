import * as adapter from '@airnode/adapter';
import { config, security } from '../config';
import { go, retryOnTimeout } from '../utils/promise-utils';
import { removeKeys } from '../utils/object-utils';
import * as logger from '../utils/logger';
import { getResponseParameters, RESERVED_PARAMETERS } from './parameters';
import { validateAggregatedApiCall } from './preprocessing';
import { AggregatedApiCall, ApiCallError, ApiCallResponse, RequestErrorCode } from '../../types';

const API_CALL_TIMEOUT = 29_000;

export async function callApi(aggregatedApiCall: AggregatedApiCall): Promise<ApiCallResponse | ApiCallError> {
  const validatedCall = validateAggregatedApiCall(aggregatedApiCall);

  // An invalid API call should never reach this point, but just in case it does
  if (validatedCall.error?.errorCode) {
    return validatedCall.error;
  }

  const { endpointName, oisTitle } = validatedCall;

  const securitySchemes = security.apiCredentials[validatedCall.oisTitle!] || [];

  const ois = config.ois.find((o) => o.title === oisTitle)!;
  const endpoint = ois.endpoints.find((e) => e.name === endpointName)!;

  // Check before making the API call in case the parameters are missing
  const responseParameters = getResponseParameters(endpoint, validatedCall.parameters || {});
  if (!responseParameters._type) {
    const message = `No '_type' parameter was found for Endpoint:${endpoint.name}, OIS:${oisTitle}`;
    logger.logJSON('ERROR', message);
    return { errorCode: RequestErrorCode.InvalidResponseParameters, message };
  }

  // Don't submit the reserved parameters to the API
  const parameters = removeKeys(validatedCall.parameters || {}, RESERVED_PARAMETERS);

  const options: adapter.Options = {
    endpointName: validatedCall.endpointName!,
    parameters,
    ois,
    securitySchemes,
  };

  // The request is allowed 20 seconds to complete before it is retried
  const adapterConfig: adapter.Config = { timeout: 20_000 };

  // If the request times out, we attempt to call the API again. Any other errors will not result in retries
  const retryableCall = retryOnTimeout(API_CALL_TIMEOUT, () =>
    adapter.buildAndExecuteRequest(options, adapterConfig)
  ) as Promise<any>;

  const [err, res] = await go(retryableCall);
  if (err) {
    const message = `Failed to call Endpoint:${validatedCall.endpointName}. ${err}`;
    logger.logJSON('ERROR', message);
    return { errorCode: RequestErrorCode.ApiCallFailed, message };
  }

  let encodedValue: string;
  try {
    const extracted = adapter.extractAndEncodeResponse(res.data, responseParameters as adapter.ResponseParameters);
    encodedValue = extracted.encodedValue;
  } catch (e) {
    const data = JSON.stringify(res?.data || {});
    const message = `Unable to find response value from ${data}. Path: ${responseParameters._path}`;
    logger.logJSON('ERROR', message);
    return { errorCode: RequestErrorCode.ResponseValueNotFound, message };
  }

  return { value: encodedValue };
}
