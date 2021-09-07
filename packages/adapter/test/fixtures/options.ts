import { BuildRequestOptions, CachedBuildRequestOptions } from '../../src/types';
import { buildOIS } from './ois';
import { securitySchemeSecrets } from './security';

export function buildRequestOptions(overrides?: Partial<BuildRequestOptions>): BuildRequestOptions {
  const ois = buildOIS();
  return {
    ois: ois,
    endpointName: 'convertToUsd',
    parameters: { f: 'ETH', amount: '1' },
    metadataParameters: {},
    securitySchemeSecrets,
    ...overrides,
  };
}

export function buildCacheRequestOptions(overrides?: Partial<CachedBuildRequestOptions>): CachedBuildRequestOptions {
  const options = buildRequestOptions();
  const endpoint = options.ois.endpoints[0];
  const { method, path } = endpoint.operation;
  const operation = options.ois.apiSpecifications.paths[path][method];
  return {
    ...options,
    endpoint,
    operation,
    ...overrides,
  };
}
