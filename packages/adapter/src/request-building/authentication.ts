import { ApiSecurityScheme } from '@api3/airnode-ois';
import reduce from 'lodash/reduce';
import find from 'lodash/find';
import { CachedBuildRequestOptions, Parameters } from '../types';

interface Authentication {
  readonly query: Parameters;
  readonly headers: Parameters;
  readonly cookies: Parameters;
}

function addApiKeyAuth(
  authentication: Authentication,
  apiSecurityScheme: ApiSecurityScheme,
  value: string
): Authentication {
  const { name } = apiSecurityScheme;
  if (!name) {
    return authentication;
  }

  switch (apiSecurityScheme.in) {
    case 'query':
      return { ...authentication, query: { ...authentication.query, [name]: value } };

    case 'header':
      return { ...authentication, headers: { ...authentication.headers, [name]: value } };

    case 'cookie':
      return { ...authentication, cookies: { ...authentication.cookies, [name]: value } };

    default:
      return authentication;
  }
}

function addHttpAuth(
  authentication: Authentication,
  apiSecurityScheme: ApiSecurityScheme,
  value: string
): Authentication {
  switch (apiSecurityScheme.scheme) {
    // The value for basic auth should be the base64 encoded value from
    // <username>:<password>
    case 'basic':
      return { ...authentication, headers: { Authorization: `Basic ${value}` } };

    // The value for bearer should be the encoded token
    case 'bearer':
      return { ...authentication, headers: { Authorization: `Bearer ${value}` } };

    default:
      return authentication;
  }
}

function addSchemeAuthentication(
  authentication: Authentication,
  apiSecurityScheme: ApiSecurityScheme,
  value: string
): Authentication {
  if (apiSecurityScheme.type === 'apiKey') {
    return addApiKeyAuth(authentication, apiSecurityScheme, value);
  }
  if (apiSecurityScheme.type === 'http') {
    return addHttpAuth(authentication, apiSecurityScheme, value);
  }
  return authentication;
}

export function buildParameters(options: CachedBuildRequestOptions): Authentication {
  const initialParameters: Authentication = {
    query: {},
    headers: {},
    cookies: {},
  };

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

      return addSchemeAuthentication(authentication, apiSecurityScheme, apiCredential.securitySchemeValue);
    },
    initialParameters
  );
}
