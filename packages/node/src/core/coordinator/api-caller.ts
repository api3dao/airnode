import adapter from '@airnode/adapter';
import { config, security } from '../config';
import { go, goTimeout, retryOperation } from '../utils/promise-utils';
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

async function callApi(callOptions: CallOptions): Promise<string | ErrorResponse> {
  const securitySchemes = security.apiCredentials[callOptions.oisTitle] || [];

  const ois = config.ois.find((o) => o.title === callOptions.oisTitle)!;
  if (!ois) {
    return {
      errorCode: RequestErrorCode.InvalidOIS,
      message: `OIS with title: '${callOptions.oisTitle}' not found`,
    };
  }

  const endpoint = ois.endpoints.find(e => e.name === callOptions.endpointName)!;
  if (!endpoint) {
    return {
      errorCode: RequestErrorCode.InvalidOIS,
      message: `Endpoint with name: '${callOptions.endpointName}' not found`,
    };
  }

  const responseParameters = response.getResponseParameters(endpoint, callOptions.parameters);
  if (!responseParameters._type) {
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

  const [err, res] = await go(adapter.buildAndExecuteRequest(options));
  if (err) {
    logger.logJSON('ERROR', `Failed to call endpoint:${callOptions.endpointName}`);
    // TODO: handle errors
  }

  const { encodedValue } = adapter.extractAndEncodeResponse(res, responseParameters as adapter.ResponseParameters);

  return encodedValue;
}

export async function callApis(state: CoordinatorState) {
  const { aggregatedApiCalls } = state;

  const apiCallRequests = aggregatedApiCalls.filter((ac) => ac.type === 'request').map((ac) => {
    const trigger = config.triggers.requests.find(r => r.endpointId === ac.endpointId)!;
    return { ...ac, oisTitle: trigger.oisTitle, endpointName: trigger.endpointName };
  });

  const promises = apiCallRequests.map(async request => {
    const [err, res] = goTimeout(30_000, callApi(request));
    return err ? null : res;
  });

  const results = await Promise.all(promises);

  return results;
}
