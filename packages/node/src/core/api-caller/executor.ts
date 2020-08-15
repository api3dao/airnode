import * as adapter from '@airnode/adapter';
import { config, security } from '../config';
import { go, retryOnTimeout } from '../utils/promise-utils';
import { removeKeys } from '../utils/object-utils';
import * as logger from '../utils/logger';
import * as response from './response-processor';
import { ApiCallParameters, RequestErrorCode } from '../../types';

export interface CallOptions {
  oisTitle: string;
  endpointName: string;
  parameters?: ApiCallParameters;
}

interface ErrorResponse {
  errorCode: number;
  message: string;
}

const API_CALL_TIMEOUT = 29_500;

export async function callApi(callOptions: CallOptions): Promise<string | ErrorResponse> {
  const { endpointName, oisTitle } = callOptions;

  const securitySchemes = security.apiCredentials[callOptions.oisTitle] || [];

  const ois = config.ois.find((o) => o.title === oisTitle)!;
  if (!ois) {
    const message = `OIS:${oisTitle} was not found`;
    logger.logJSON('ERROR', message);
    return { errorCode: RequestErrorCode.InvalidOIS, message };
  }

  const endpoint = ois.endpoints.find((e) => e.name === endpointName)!;
  if (!endpoint) {
    const message = `Endpoint:${endpointName} was not found in OIS:${oisTitle}`;
    logger.logJSON('ERROR', message);
    return { errorCode: RequestErrorCode.InvalidOIS, message };
  }

  const responseParameters = response.getResponseParameters(endpoint, callOptions.parameters || {});
  if (!responseParameters._type) {
    const message = `No '_type' parameter was found for Endpoint:${endpoint.name}, OIS:${oisTitle}`;
    logger.logJSON('ERROR', message);
    return { errorCode: RequestErrorCode.InvalidResponseParameters, message };
  }

  // Don't submit the reserved parameters to the API
  const parameters = removeKeys(callOptions.parameters || {}, ['_path', '_times', '_type']);

  const options: adapter.Options = {
    endpointName,
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
    const message = `Failed to call Endpoint:${callOptions.endpointName}. ${err}`;
    logger.logJSON('ERROR', message);
    return { errorCode: RequestErrorCode.ApiCallFailed, message };
  }

  let encodedValue: string;
  try {
    const extracted = adapter.extractAndEncodeResponse(res.body, responseParameters as adapter.ResponseParameters);
    encodedValue = extracted.encodedValue;
  } catch (e) {
    const message = `Unable to find response value from ${JSON.stringify(res?.body || {})}. Path: ${
      responseParameters._path
    }`;
    logger.logJSON('ERROR', message);
    return { errorCode: RequestErrorCode.ResponseValueNotFound, message };
  }

  return encodedValue;
}
