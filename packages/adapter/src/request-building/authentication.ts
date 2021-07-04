import { ApiSecurityScheme } from '@api3/ois';
import isEmpty from 'lodash/isEmpty';
import { CachedBuildRequestOptions, Parameters } from '../types';

type Authentication = {
  readonly query: Parameters;
  readonly headers: Parameters;
  readonly cookies: Parameters;
};

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

  const { securitySchemeSecrets } = options;
  // Security schemes originate from 'config.json' and contain all of the authentication details
  // but the actual secrets and values needed by the Airnode deployment will come from 'secrets.env'
  if (!securitySchemeSecrets || isEmpty(securitySchemeSecrets)) {
    return initialParameters;
  }

  // API security schemes also originate from 'config.json' and specify which schemes should be used
  const apiSecuritySchemes = options.ois.apiSpecifications.components.securitySchemes;
  if (isEmpty(apiSecuritySchemes)) {
    return initialParameters;
  }

  const apiSecuritySchemeNames = Object.keys(apiSecuritySchemes);

  return apiSecuritySchemeNames.reduce((authentication, apiSecuritySchemeName) => {
    const apiSecurityScheme = apiSecuritySchemes[apiSecuritySchemeName];

    // If there are no credentials in `secrets.env`, ignore the scheme
    const securitySchemeSecret = securitySchemeSecrets.find(
      ({ securitySchemeName }) => securitySchemeName === apiSecuritySchemeName
    );
    if (!securitySchemeSecret) {
      return authentication;
    }

    return addSchemeAuthentication(authentication, apiSecurityScheme, securitySchemeSecret.value);
  }, initialParameters);
}
