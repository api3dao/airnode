import isEmpty from 'lodash/isEmpty';
import { ApiSecurityScheme } from '@airnode/node/types';
import { Parameters, State } from '../types';

interface Authentication {
  query: Parameters;
  headers: Parameters;
  cookies: Parameters;
}

function initialAuthentication(): Authentication {
  return {
    query: {},
    headers: {},
    cookies: {},
  };
}

function addApiKeyAuth(authentication: Authentication, securityScheme: ApiSecurityScheme, value: string) {
  const { name } = securityScheme;

  switch (securityScheme.in) {
    case 'query':
      return { ...authentication, query: { ...authentication.query, [name]: value } };
    case 'header':
      return { ...authentication, headers: { ...authentication.headers, [name]: value } };
    case 'cookie':
      return { ...authentication, cookies: { ...authentication.cookies, [name]: value } };
  }
}

function addHttpAuth(authentication: Authentication, securityScheme: ApiSecurityScheme, value: string) {

}

export function buildAuthentication(state: State) {
  const { securitySchemes } = state;
  // Security schemes originate from 'security.json' and contain all of the authentication details
  if (!securitySchemes || isEmpty(securitySchemes)) {
    return;
  }

  // API security schemes originate from 'config.json' and specify which schemes should be used
  const apiSchemes = state.ois.apiSpecifications.components.securitySchemes;
  if (isEmpty(apiSchemes)) {
    return;
  }

  const apiSchemeNames = Object.keys(apiSchemes);

  const asd = apiSchemeNames.reduce((acc, schemeName) => {
    const apiScheme = apiSchemes[schemeName];

    const securityScheme = securitySchemes.find(scheme => scheme.securitySchemeName === schemeName);
    if (!securityScheme) {
      return acc;
    }

    if (apiScheme.type === 'apiKey') {
      return addApiKeyAuth(acc, apiScheme, securityScheme.value);
    }

    if (apiScheme.type === 'http') {

    }
  }, initialAuthentication());

  // for (const key in schemeKeys) {
  //   const securityScheme = securitySchemes.find(s => s.securitySchemeName === key);
  //   if (securityScheme!.type === 'apiKey') {
  //     // TODO
  //   }
  //
  //   if (securityScheme!.type === 'http') {
  //     // TODO
  //   }
  // }
}
