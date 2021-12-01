/* eslint-disable functional/immutable-data */

import { ApiKeySecurityScheme, ApiSecurityScheme, ApiSpecification } from '@api3/airnode-ois';
import * as authentication from './authentication';
import * as fixtures from '../../test/fixtures';

describe('building empty parameters', () => {
  it('returns no parameters if API security is empty', () => {
    const ois = fixtures.buildOIS();
    const apiSpecifications: ApiSpecification = {
      ...ois.apiSpecifications,
      security: {},
    };
    const invalidOIS = fixtures.buildOIS({ apiSpecifications });
    const options = fixtures.buildCacheRequestOptions({ ois: invalidOIS });
    const res = authentication.buildParameters(options);
    expect(res).toEqual({
      headers: {},
      query: {},
      cookies: {},
    });
  });

  it('returns no parameters if API securitySchemes is empty', () => {
    const ois = fixtures.buildOIS();
    const apiSpecifications: ApiSpecification = {
      ...ois.apiSpecifications,
      components: {
        ...ois.apiSpecifications.components,
        securitySchemes: {},
      },
    };
    const invalidOIS = fixtures.buildOIS({ apiSpecifications });
    const options = fixtures.buildCacheRequestOptions({ ois: invalidOIS });
    const res = authentication.buildParameters(options);
    expect(res).toEqual({
      headers: {},
      query: {},
      cookies: {},
    });
  });

  it('returns no parameters if API credentials is empty', () => {
    const options = fixtures.buildCacheRequestOptions({ apiCredentials: undefined });
    const res = authentication.buildParameters(options);
    expect(res).toEqual({
      headers: {},
      query: {},
      cookies: {},
    });
  });
});

describe('building API key authentication parameters', () => {
  it('returns the API key in the query', () => {
    const options = fixtures.buildCacheRequestOptions();
    const res = authentication.buildParameters(options);
    expect(res).toEqual({
      query: { access_key: 'super-secret-key' },
      headers: {},
      cookies: {},
    });
  });

  it('returns the API key in the headers', () => {
    const ois = fixtures.buildOIS();
    (ois.apiSpecifications.components.securitySchemes.myapiApiScheme as ApiKeySecurityScheme).in = 'header';
    const options = fixtures.buildCacheRequestOptions({ ois });
    const res = authentication.buildParameters(options);
    expect(res).toEqual({
      query: {},
      headers: { access_key: 'super-secret-key' },
      cookies: {},
    });
  });

  it('returns the API key in the cookies', () => {
    const ois = fixtures.buildOIS();
    (ois.apiSpecifications.components.securitySchemes.myapiApiScheme as ApiKeySecurityScheme).in = 'cookie';
    const options = fixtures.buildCacheRequestOptions({ ois });
    const res = authentication.buildParameters(options);
    expect(res).toEqual({
      query: {},
      headers: {},
      cookies: { access_key: 'super-secret-key' },
    });
  });
});

describe('building HTTP authentication parameters', () => {
  it('returns Basic Authentication in the headers', () => {
    const ois = fixtures.buildOIS();
    const scheme: ApiSecurityScheme = { scheme: 'basic', type: 'http' };
    ois.apiSpecifications.components.securitySchemes.myapiApiScheme = scheme;
    const apiCredentials = fixtures.buildCredentials({ securitySchemeValue: 'd2h5YXJleW91OnJlYWRpbmd0aGlz' });
    const options = fixtures.buildCacheRequestOptions({ ois, apiCredentials });
    const res = authentication.buildParameters(options);
    expect(res).toEqual({
      query: {},
      headers: { Authorization: 'Basic d2h5YXJleW91OnJlYWRpbmd0aGlz' },
      cookies: {},
    });
  });

  it('returns Bearer Authentication in the headers', () => {
    const ois = fixtures.buildOIS();
    const scheme: ApiSecurityScheme = { scheme: 'bearer', type: 'http' };
    ois.apiSpecifications.components.securitySchemes.myapiApiScheme = scheme;
    const apiCredentials = fixtures.buildCredentials({ securitySchemeValue: 'secret-jwt' });
    const options = fixtures.buildCacheRequestOptions({ ois, apiCredentials });
    const res = authentication.buildParameters(options);
    expect(res).toEqual({
      query: {},
      headers: { Authorization: 'Bearer secret-jwt' },
      cookies: {},
    });
  });
});

describe('relay metadata', () => {
  it('relays chain id', () => {
    const ois = fixtures.buildOIS();
    const scheme: ApiSecurityScheme = { in: 'header', type: 'relayChainId', name: 'chainId' };
    ois.apiSpecifications.components.securitySchemes.myapiApiScheme = scheme;
    const options = fixtures.buildCacheRequestOptions({ ois });
    const res = authentication.buildParameters(options);
    expect(res).toEqual({
      query: {},
      headers: { chainId: '31337' },
      cookies: {},
    });
  });

  it('relays chain type', () => {
    const ois = fixtures.buildOIS();
    const scheme: ApiSecurityScheme = { in: 'cookie', type: 'relayChainType', name: 'chainType' };
    ois.apiSpecifications.components.securitySchemes.myapiApiScheme = scheme;
    const options = fixtures.buildCacheRequestOptions({ ois });
    const res = authentication.buildParameters(options);
    expect(res).toEqual({
      query: {},
      headers: {},
      cookies: { chainType: 'evm' },
    });
  });

  it('relays requester address', () => {
    const ois = fixtures.buildOIS();
    const scheme: ApiSecurityScheme = { in: 'query', type: 'relayRequesterAddress', name: 'requesterAddress' };
    ois.apiSpecifications.components.securitySchemes.myapiApiScheme = scheme;
    const options = fixtures.buildCacheRequestOptions({ ois });
    const res = authentication.buildParameters(options);
    expect(res).toEqual({
      query: { requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' },
      headers: {},
      cookies: {},
    });
  });
});
