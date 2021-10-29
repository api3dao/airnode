import { buildRequest } from './build-request';
import * as http from '../clients/http';
import { BuildRequestOptions, Config, Request } from '../types';

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
