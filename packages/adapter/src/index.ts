import BigNumber from 'bignumber.js';
import * as http from './clients/http';
import { initialize as initializeState } from './state';
import { Config, Options, Request, ResponseParameters } from './types';
import * as requestBuilder from './request-builder';
import {
  isNumberType,
  processByExtracting,
  processByCasting,
  processByMultiplying,
  processByEncoding,
} from './response-processor';

export * from './types';

// Re-export functions from response-processor
export { isNumberType, processByExtracting, processByCasting, processByMultiplying, processByEncoding };

export function buildRequest(options: Options): Request {
  const state = initializeState(options);

  return requestBuilder.build(state);
}

export function executeRequest(request: Request, config?: Config) {
  switch (request.method) {
    case 'get':
      return http.get(request, config);

    case 'post':
      return http.post(request, config);
  }
}

export function buildAndExecuteRequest(options: Options, config?: Config) {
  const request = buildRequest(options);
  return executeRequest(request, config);
}

export function extractAndEncodeResponse(data: unknown, parameters: ResponseParameters) {
  const rawValue = processByExtracting(data, parameters._path);

  let value = processByCasting(rawValue, parameters._type);

  if (isNumberType(parameters._type)) {
    value = processByMultiplying(value as BigNumber, parameters._times);
  }

  const encodedValue = processByEncoding(value, parameters._type);

  return { value, encodedValue };
}
