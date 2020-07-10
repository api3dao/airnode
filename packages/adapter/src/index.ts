import * as http from './clients/http';
import { initialize as initializeState } from './state';
import { Config, Options, Request, ResponseParameters } from './types';
import * as requestBuilder from './request-builder';
import * as responseProcessor from './response-processor';

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

export function extractResponse(data: unknown, parameters: ResponseParameters) {
  return responseProcessor.extractResponse(data, parameters);
}
