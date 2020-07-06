import { Options, State } from './types';

export function initialize(options: Options): State {
  const { ois } = options;

  const endpoint = ois.endpoints.find((e) => e.name === options.endpointName);
  if (!endpoint) {
    throw new Error(`Endpoint: '${options.endpointName}' not found in the OIS.`);
  }

  const { method, path } = endpoint.operation;

  const operation = ois.apiSpecifications.paths[path][method];

  return { ...options, operation, endpoint };
}
