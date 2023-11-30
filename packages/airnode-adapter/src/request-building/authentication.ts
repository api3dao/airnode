import { ApiKeySecurityScheme, ApiSecurityScheme, ConfigurableSecurityScheme, HttpSecurityScheme } from '@api3/ois';
import reduce from 'lodash/reduce';
import find from 'lodash/find';
import merge from 'lodash/merge';
import { CachedBuildRequestOptions, Parameters, BaseApiCredentials } from '../types';

interface Authentication {
  readonly query: Parameters;
  readonly headers: Parameters;
  readonly cookies: Parameters;
}

function createEmptyAuthentication(): Authentication {
  return {
    query: {},
    headers: {},
    cookies: {},
  };
}

function createSchemeAuthentication(
  authSection: keyof Authentication,
  name: string,
  value: string
): Partial<Authentication> {
  return { [authSection]: { [name]: value } };
}

function getAuthenticationSection(apiSecurityScheme: ConfigurableSecurityScheme): keyof Authentication {
  switch (apiSecurityScheme.in) {
    case 'query':
      return 'query';
    case 'header':
      return 'headers';
    case 'cookie':
      return 'cookies';
  }
}

function getApiKeyAuth(
  apiSecurityScheme: ApiKeySecurityScheme,
  credentials: BaseApiCredentials | null
): Partial<Authentication> {
  if (!credentials) return {};
  const { name } = apiSecurityScheme;
  const value = credentials.securitySchemeValue;
  const authSection = getAuthenticationSection(apiSecurityScheme);

  if (!name || !authSection) return {};
  return createSchemeAuthentication(authSection, name, value);
}

function getHttpAuth(
  httpSecurityScheme: HttpSecurityScheme,
  credentials: BaseApiCredentials | null
): Partial<Authentication> {
  if (!credentials) return {};
  const value = credentials.securitySchemeValue;

  switch (httpSecurityScheme.scheme) {
    // The value for basic auth should be the base64 encoded value from
    // <username>:<password>
    case 'basic':
      return createSchemeAuthentication('headers', 'Authorization', `Basic ${value}`);
    // The value for bearer should be the encoded token
    case 'bearer':
      return createSchemeAuthentication('headers', 'Authorization', `Bearer ${value}`);
    default:
      return {};
  }
}

function getRelayAuthSchemeFromMetadata(
  apiSecurityScheme: ConfigurableSecurityScheme,
  options: CachedBuildRequestOptions,
  metadataKey: keyof NonNullable<CachedBuildRequestOptions['metadata']>
): Partial<Authentication> {
  if (!options.metadata) return {};
  return createSchemeAuthentication(
    getAuthenticationSection(apiSecurityScheme),
    apiSecurityScheme.name,
    options.metadata[metadataKey]
  );
}

function getSchemeAuthentication(
  apiSecurityScheme: ApiSecurityScheme,
  credentials: BaseApiCredentials | null,
  options: CachedBuildRequestOptions
): Partial<Authentication> {
  switch (apiSecurityScheme.type) {
    case 'apiKey':
      return getApiKeyAuth(apiSecurityScheme, credentials);
    case 'http':
      return getHttpAuth(apiSecurityScheme, credentials);
    case 'relayChainId':
      return getRelayAuthSchemeFromMetadata(apiSecurityScheme, options, 'chainId');
    case 'relayChainType':
      return getRelayAuthSchemeFromMetadata(apiSecurityScheme, options, 'chainType');
    case 'relayRequesterAddress':
      return getRelayAuthSchemeFromMetadata(apiSecurityScheme, options, 'requesterAddress');
    case 'relaySponsorAddress':
      return getRelayAuthSchemeFromMetadata(apiSecurityScheme, options, 'sponsorAddress');
    case 'relaySponsorWalletAddress':
      return getRelayAuthSchemeFromMetadata(apiSecurityScheme, options, 'sponsorWalletAddress');
    case 'relayRequestId':
      return getRelayAuthSchemeFromMetadata(apiSecurityScheme, options, 'requestId');
  }
}

export function buildParameters(options: CachedBuildRequestOptions): Authentication {
  return reduce(
    options.ois.apiSpecifications.security,
    (authentication, _security, apiSecuritySchemeName) => {
      const apiSecurityScheme = options.ois.apiSpecifications.components.securitySchemes[apiSecuritySchemeName];
      const apiCredentials = find(options.apiCredentials, ['securitySchemeName', apiSecuritySchemeName]) ?? null;
      return merge(authentication, getSchemeAuthentication(apiSecurityScheme, apiCredentials, options));
    },
    createEmptyAuthentication()
  );
}
