import { buildParameters } from './parameters';
import { parsePathWithParameters } from './path-parser';
import { BuildRequestOptions, CachedBuildRequestOptions, Request } from '../types';

function cacheRequestOptions(options: BuildRequestOptions): CachedBuildRequestOptions {
  const { ois } = options;

  const endpoint = ois.endpoints.find((e) => e.name === options.endpointName);
  if (!endpoint) {
    throw new Error(`Endpoint: '${options.endpointName}' not found in the OIS.`);
  }

  const { method, path } = endpoint.operation!;
  const operation = ois.apiSpecifications.paths[path][method]!;
  return { ...options, endpoint, operation };
}

export function buildRequest(options: BuildRequestOptions): Request {
  const { ois } = options;

  const cachedOptions = cacheRequestOptions(options);
  const { endpoint } = cachedOptions;

  // A single base URL should always exist at the API level
  // Different base URLs are not supported at the operation level
  const baseUrl = ois.apiSpecifications.servers[0].url;
  const parameters = buildParameters(cachedOptions);
  const path = parsePathWithParameters(endpoint.operation!.path, parameters.paths);

  return {
    baseUrl,
    path,
    method: endpoint.operation!.method,
    headers: parameters.headers,
    data: parameters.query,
  };
}
