import { ApiSecurityScheme } from '@api3/airnode-ois';
import reduce from 'lodash/reduce';
import find from 'lodash/find';
import merge from 'lodash/merge';
import { CachedBuildRequestOptions, Parameters, ApiCredentials } from '../types';

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

function getAuthenticationSection(apiSecurityScheme: ApiSecurityScheme): keyof Authentication | null {
  switch (apiSecurityScheme.in) {
    case 'query':
      return 'query';
    case 'header':
      return 'headers';
    case 'cookie':
      return 'cookies';
    default:
      return null;
  }
}

function getApiKeyAuth(apiSecurityScheme: ApiSecurityScheme, credentials: ApiCredentials): Partial<Authentication> {
  const { name } = apiSecurityScheme;
  const value = credentials.securitySchemeValue;
  const authSection = getAuthenticationSection(apiSecurityScheme);

  if (!name || !authSection) return {};
  return createSchemeAuthentication(authSection, name, value);
}

function getHttpAuth(apiSecurityScheme: ApiSecurityScheme, credentials: ApiCredentials): Partial<Authentication> {
  const value = credentials.securitySchemeValue;

  switch (apiSecurityScheme.scheme) {
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

function getSchemeAuthentication(
  apiSecurityScheme: ApiSecurityScheme,
  credential: ApiCredentials,
  options: CachedBuildRequestOptions
): Partial<Authentication> {
  const authSection = getAuthenticationSection(apiSecurityScheme);

  switch (apiSecurityScheme.type) {
    case 'apiKey':
      return getApiKeyAuth(apiSecurityScheme, credential);
    case 'http':
      return getHttpAuth(apiSecurityScheme, credential);
    case 'relayChainId':
      if (!authSection) return {};
      return createSchemeAuthentication(authSection, credential.securitySchemeName, options.metadata.chainId);
    case 'relayChainType':
      if (!authSection) return {};
      return createSchemeAuthentication(authSection, credential.securitySchemeName, options.metadata.chainType);
    case 'relayRequesterAddress':
      if (!authSection) return {};
      return createSchemeAuthentication(authSection, credential.securitySchemeName, options.metadata.requesterAddress);
    default:
      return {};
  }
}

export function buildParameters(options: CachedBuildRequestOptions): Authentication {
  return reduce(
    options.ois.apiSpecifications.security,
    (authentication, _security, apiSecuritySchemeName) => {
      const apiSecurityScheme = options.ois.apiSpecifications.components.securitySchemes[apiSecuritySchemeName];
      // If there is no security scheme, ignore the scheme
      if (!apiSecurityScheme) {
        return authentication;
      }

      const apiCredential = find(options.apiCredentials, ['securitySchemeName', apiSecuritySchemeName]);
      // If there are no credentials available, ignore the scheme
      if (!apiCredential) {
        return authentication;
      }

      return merge(authentication, getSchemeAuthentication(apiSecurityScheme, apiCredential, options));
    },
    createEmptyAuthentication()
  );
}
