import * as http from './clients/http';
import { initialize as initializeState } from './state';
import { Config, Options, Request, ResponseParameters } from './types';
import * as requestBuilder from './request-builder';
import { isNumberType, extractResponseValue, castValue, multiplyValue, encodeValue } from './response-processor';

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

// Re-export functions from response-processor
export { isNumberType, extractResponseValue, castValue, multiplyValue, encodeValue };

export function extractAndEncodeResponse(data: unknown, parameters: ResponseParameters) {
  const rawValue = extractResponseValue(data, parameters._path);

  let value = castValue(rawValue, parameters._type);

  const numberType = isNumberType(parameters._type);
  if (parameters._times && typeof value === 'number' && numberType) {
    value = multiplyValue(value, parameters._times);
  }

  const encodedValue = encodeValue(value, parameters._type);

  return { value, encodedValue };
}
