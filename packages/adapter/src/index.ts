import BigNumber from 'bignumber.js';
import * as http from './clients/http';
import { BuildRequestOptions, Config, Request, ResponseParameters } from './types';
import * as building from './request-building';
import * as processing from './response-processing';

export * from './types';

export function buildRequest(options: BuildRequestOptions): Request {
  return building.buildRequest(options);
}

export function executeRequest(request: Request, config?: Config) {
  switch (request.method) {
    case 'get':
      return http.get(request, config);

    case 'post':
      return http.post(request, config);
  }
}

export function buildAndExecuteRequest(options: BuildRequestOptions, config?: Config) {
  const request = buildRequest(options);
  return executeRequest(request, config);
}

export function extractAndEncodeResponse(data: unknown, parameters: ResponseParameters) {
  const rawValue = processing.extractValue(data, parameters._path);
  const value = processing.castValue(rawValue, parameters._type);

  if (parameters._type === 'int256') {
    const multipledValue = processing.multiplyValue(value as BigNumber, parameters._times);
    const encodedValue = processing.encodeValue(multipledValue.toString(), 'int256');
    return { value, encodedValue };
  }

  const encodedValue = processing.encodeValue(value, parameters._type);
  return { value, encodedValue };
}
