/* eslint-disable functional/immutable-data */

import { ApiSecurityScheme, ApiSpecification } from '@api3/ois';
import * as authentication from './authentication';
import * as fixtures from '../../test/fixtures';

describe('building empty parameters', () => {
  it('returns no parameters if credentials is empty', () => {
    const options = fixtures.buildCacheRequestOptions({ credentials: undefined });
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
    ois.apiSpecifications.components.securitySchemes.myapiApiScheme.in = 'header';
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
    ois.apiSpecifications.components.securitySchemes.myapiApiScheme.in = 'cookie';
    const options = fixtures.buildCacheRequestOptions({ ois });
    const res = authentication.buildParameters(options);
    expect(res).toEqual({
      query: {},
      headers: {},
      cookies: { access_key: 'super-secret-key' },
    });
  });

  it('ignores undefined scheme names', () => {
    const ois = fixtures.buildOIS();
    ois.apiSpecifications.components.securitySchemes.myapiApiScheme.name = undefined;
    const options = fixtures.buildCacheRequestOptions({ ois });
    const res = authentication.buildParameters(options);
    expect(res).toEqual({
      query: {},
      headers: {},
      cookies: {},
    });
  });

  it('ignores undefined scheme targets', () => {
    const ois = fixtures.buildOIS();
    ois.apiSpecifications.components.securitySchemes.myapiApiScheme.in = undefined;
    const options = fixtures.buildCacheRequestOptions({ ois });
    const res = authentication.buildParameters(options);
    expect(res).toEqual({
      query: {},
      headers: {},
      cookies: {},
    });
  });
});

describe('building HTTP authentication parameters', () => {
  it('returns Basic Authentication in the headers', () => {
    const ois = fixtures.buildOIS();
    const scheme: ApiSecurityScheme = { scheme: 'basic', type: 'http' };
    ois.apiSpecifications.components.securitySchemes.myapiApiScheme = scheme;
    const options = fixtures.buildCacheRequestOptions({ ois });
    options.credentials!.value = 'd2h5YXJleW91OnJlYWRpbmd0aGlz';
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
    const options = fixtures.buildCacheRequestOptions({ ois });
    options.credentials!.value = 'secret-jwt';
    const res = authentication.buildParameters(options);
    expect(res).toEqual({
      query: {},
      headers: { Authorization: 'Bearer secret-jwt' },
      cookies: {},
    });
  });

  it('ignores unknown or undefined schemes', () => {
    const ois = fixtures.buildOIS();
    ois.apiSpecifications.components.securitySchemes.myapiApiScheme.type = 'http';
    ois.apiSpecifications.components.securitySchemes.myapiApiScheme.scheme = undefined;
    const options = fixtures.buildCacheRequestOptions({ ois });
    const res = authentication.buildParameters(options);
    expect(res).toEqual({
      query: {},
      headers: {},
      cookies: {},
    });
  });
});
