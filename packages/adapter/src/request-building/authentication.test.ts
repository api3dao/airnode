import { ApiSecurityScheme, ApiSpecification } from '@airnode/ois';
import * as fixtures from '../../test/fixtures';
import * as authentication from './authentication';

describe('building empty parameters', () => {
  it('returns no parameters if secret securitySchemes is empty', () => {
    const options = fixtures.buildCacheRequestOptions({ securitySchemes: undefined });
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

  it('ignores schemes that do not have a matching secret schemes', () => {
    const ois = fixtures.buildOIS();
    const securitySchemes = [{ securitySchemeName: 'unknown', value: 'supersecret' }];
    const options = fixtures.buildCacheRequestOptions({ ois, securitySchemes });
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

  it('returns the API key in multiple places', () => {
    const ois = fixtures.buildOIS();
    const queryScheme: ApiSecurityScheme = { in: 'query', type: 'apiKey', name: 'query_key' };
    const headerScheme: ApiSecurityScheme = { in: 'header', type: 'apiKey', name: 'header_key' };
    const cookieScheme: ApiSecurityScheme = { in: 'cookie', type: 'apiKey', name: 'cookie_key' };
    ois.apiSpecifications.components.securitySchemes.queryScheme = queryScheme;
    ois.apiSpecifications.components.securitySchemes.headerScheme = headerScheme;
    ois.apiSpecifications.components.securitySchemes.cookieScheme = cookieScheme;
    const securitySchemes = [
      { value: 'secret-query', securitySchemeName: 'queryScheme' },
      { value: 'secret-header', securitySchemeName: 'headerScheme' },
      { value: 'secret-cookie', securitySchemeName: 'cookieScheme' },
    ];
    const options = fixtures.buildCacheRequestOptions({ ois, securitySchemes });
    const res = authentication.buildParameters(options);
    expect(res).toEqual({
      query: { query_key: 'secret-query' },
      headers: { header_key: 'secret-header' },
      cookies: { cookie_key: 'secret-cookie' },
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
    options.securitySchemes![0].value = 'd2h5YXJleW91OnJlYWRpbmd0aGlz';
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
    options.securitySchemes![0].value = 'secret-jwt';
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
