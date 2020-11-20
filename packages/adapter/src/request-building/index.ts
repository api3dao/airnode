import { Request, State } from '../types';
import { buildParameters } from './parameters';
import { parsePathWithParameters } from './path-parser';

export function buildRequest(state: State): Request {
  const { endpoint, ois } = state;

  // A single base URL should always exist at the API level
  // Different base URLs are not supported at the operation level
  const baseUrl = ois.apiSpecifications.servers[0].url;

  const parameters = buildParameters(state);
  const path = parsePathWithParameters(endpoint.operation.path, parameters.paths);

  return {
    baseUrl,
    path,
    method: endpoint.operation.method,
    headers: parameters.headers,
    data: parameters.query,
  };
}
