import { ApiSecurityScheme } from '@api3/ois';
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

  const { credentials } = options;
  if (!credentials) {
    return initialParameters;
  }

  // API security schemes also originate from 'config.json' and specify which schemes should be used
  const apiSecurityScheme = options.ois.apiSpecifications.components.securitySchemes[credentials.securityScheme];
  if (!apiSecurityScheme) {
    return initialParameters;
  }

  return addSchemeAuthentication(initialParameters, apiSecurityScheme, credentials.value);
}
