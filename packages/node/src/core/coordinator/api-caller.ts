import adapter from '@airnode/adapter';
import { config, security } from '../config';
import { go, goTimeout, retryOnTimeout } from '../utils/promise-utils';
import { removeKeys } from '../utils/object-utils';
import * as logger from '../utils/logger';
import * as response from '../requests/api-calls/response';
import { AggregatedApiCall, CoordinatorState, RequestErrorCode } from '../../types';

interface CallOptions extends AggregatedApiCall {
  oisTitle: string;
  endpointName: string;
}

interface ErrorResponse {
  errorCode: number;
  message: string;
}

const API_CALL_TIMEOUT = 29_500;

async function callApi(callOptions: CallOptions): Promise<string | ErrorResponse> {
  const { endpointName, oisTitle } = callOptions;

  const securitySchemes = security.apiCredentials[callOptions.oisTitle] || [];

  const ois = config.ois.find((o) => o.title === oisTitle)!;
  if (!ois) {
    logger.logJSON('ERROR', `Failed to call Endpoint:${endpointName} as the OIS:${oisTitle} was not found`);
    return {
      errorCode: RequestErrorCode.InvalidOIS,
      message: `OIS:${oisTitle} was not found`,
    };
  }

  const endpoint = ois.endpoints.find((e) => e.name === callOptions.endpointName)!;
  if (!endpoint) {
    logger.logJSON(
      'ERROR',
      `Failed to call Endpoint:${callOptions.endpointName} as it was not found in OIS:${oisTitle}`
    );
    return {
      errorCode: RequestErrorCode.InvalidOIS,
      message: `Endpoint:${callOptions.endpointName} was not found in OIS:${oisTitle}`,
    };
  }

  const responseParameters = response.getResponseParameters(endpoint, callOptions.parameters);
  if (!responseParameters._type) {
    logger.logJSON('ERROR', `Failed to call Endpoint:${endpoint.name} as no '_type' was supplied`);
    return {
      errorCode: RequestErrorCode.InvalidResponseParameters,
      message: "A '_type' parameter is required in either reserverdParameters or with the request",
    };
  }

  // Don't submit the reserved parameters to the API
  const parameters = removeKeys(callOptions.parameters || {}, ['_path', '_times', '_type']);

  const options: adapter.Options = {
    endpointName: callOptions.endpointName,
    parameters,
    ois,
    securitySchemes,
  };

  // The request is allowed 20 seconds to complete before it is retried
  const adapterConfig: adapter.Config = { timeout: 20_000 };

  // If the request times out, we attempt to call the API again. Any other errors will not result in retries
  const retryableCall = retryOnTimeout(API_CALL_TIMEOUT - 500, () =>
    adapter.buildAndExecuteRequest(options, adapterConfig)
  );

  const [err, res] = await go(retryableCall);
  if (err) {
    logger.logJSON('ERROR', `Failed to call endpoint:${callOptions.endpointName}. ${err}`);
    return {
      errorCode: RequestErrorCode.ApiCallFailed,
      message: `Failed to call Endpoint:${endpointName}`,
    };
  }

  const { encodedValue } = adapter.extractAndEncodeResponse(res, responseParameters as adapter.ResponseParameters);

  return encodedValue;
}

export async function callApis(state: CoordinatorState) {
  const { aggregatedApiCalls } = state;

  const apiCallRequests = aggregatedApiCalls
    .filter((ac) => ac.type === 'request')
    .map((ac) => {
      const trigger = config.triggers.requests.find((r) => r.endpointId === ac.endpointId)!;
      return { ...ac, oisTitle: trigger.oisTitle, endpointName: trigger.endpointName };
    });

  const promises = apiCallRequests.map(async (request) => {
    const [err, res] = await goTimeout(API_CALL_TIMEOUT, callApi(request));
    return err ? null : res;
  });

  const results = await Promise.all(promises);

  return results;
}
