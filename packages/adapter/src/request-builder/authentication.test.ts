import { ApiSecurityScheme } from '@airnode/ois';
import { State } from '../types';
import { initialize as initializeState } from '../state';
import * as fixtures from '../../test/__fixtures__';
import * as authentication from './authentication';

describe('building empty parameters', () => {
  let state: State;

  beforeEach(() => {
    state = initializeState(fixtures.getOptions());
  });

  it('returns no parameters if secret securitySchemes is empty', () => {
    state.securitySchemes = undefined;
    const res = authentication.buildParameters(state);
    expect(res).toEqual({
      headers: {},
      query: {},
      cookies: {},
    });
  });

  it('returns no parameters if API securitySchemes is empty', () => {
    state.ois.apiSpecifications.components.securitySchemes = {};
    const res = authentication.buildParameters(state);
    expect(res).toEqual({
      headers: {},
      query: {},
      cookies: {},
    });
  });

  it('ignores schemes that do not have a matching secrets', () => {
    state.securitySchemes = [{ securitySchemeName: 'unknown', value: 'supersecret' }];
    const res = authentication.buildParameters(state);
    expect(res).toEqual({
      headers: {},
      query: {},
      cookies: {},
    });
  });
});

describe('building API key authentication parameters', () => {
  let state: State;

  beforeEach(() => {
    state = initializeState(fixtures.getOptions());
  });

  it('returns the API key in the query', () => {
    const res = authentication.buildParameters(state);
    expect(res).toEqual({
      query: { access_key: 'super-secret-key' },
      headers: {},
      cookies: {},
    });
  });

  it('returns the API key in the headers', () => {
    state.ois.apiSpecifications.components.securitySchemes.myapiApiScheme.in = 'header';
    const res = authentication.buildParameters(state);
    expect(res).toEqual({
      query: {},
      headers: { access_key: 'super-secret-key' },
      cookies: {},
    });
  });

  it('returns the API key in the cookies', () => {
    state.ois.apiSpecifications.components.securitySchemes.myapiApiScheme.in = 'cookie';
    const res = authentication.buildParameters(state);
    expect(res).toEqual({
      query: {},
      headers: {},
      cookies: { access_key: 'super-secret-key' },
    });
  });

  it('returns the API key in multiple places', () => {
    const headerScheme: ApiSecurityScheme = { in: 'header', type: 'apiKey', name: 'header_key' };
    state.ois.apiSpecifications.components.securitySchemes.headerApiScheme = headerScheme;

    const cookieScheme: ApiSecurityScheme = { in: 'cookie', type: 'apiKey', name: 'cookie_key' };
    state.ois.apiSpecifications.components.securitySchemes.cookieApiScheme = cookieScheme;

    state.securitySchemes = [
      ...state.securitySchemes!,
      { value: 'secret-header', securitySchemeName: 'headerApiScheme' },
      { value: 'secret-cookie', securitySchemeName: 'cookieApiScheme' },
    ];

    const res = authentication.buildParameters(state);
    expect(res).toEqual({
      query: { access_key: 'super-secret-key' },
      headers: { header_key: 'secret-header' },
      cookies: { cookie_key: 'secret-cookie' },
    });
  });

  it('ignores undefined scheme names', () => {
    state.ois.apiSpecifications.components.securitySchemes.myapiApiScheme.name = undefined;
    const res = authentication.buildParameters(state);
    expect(res).toEqual({
      query: {},
      headers: {},
      cookies: {},
    });
  });

  it('ignores undefined scheme targets', () => {
    state.ois.apiSpecifications.components.securitySchemes.myapiApiScheme.in = undefined;
    const res = authentication.buildParameters(state);
    expect(res).toEqual({
      query: {},
      headers: {},
      cookies: {},
    });
  });
});

describe('building HTTP authentication parameters', () => {
  let state: State;

  beforeEach(() => {
    state = initializeState(fixtures.getOptions());
  });

  it('returns Basic Authentication in the headers', () => {
    const scheme: ApiSecurityScheme = { scheme: 'basic', type: 'http' };
    state.ois.apiSpecifications.components.securitySchemes.myapiApiScheme = scheme;

    state.securitySchemes![0].value = 'd2h5YXJleW91OnJlYWRpbmd0aGlz';

    const res = authentication.buildParameters(state);
    expect(res).toEqual({
      query: {},
      headers: { Authorization: 'Basic d2h5YXJleW91OnJlYWRpbmd0aGlz' },
      cookies: {},
    });
  });

  it('returns Bearer Authentication in the headers', () => {
    const scheme: ApiSecurityScheme = { scheme: 'bearer', type: 'http' };
    state.ois.apiSpecifications.components.securitySchemes.myapiApiScheme = scheme;

    state.securitySchemes![0].value = 'secret-jwt';

    const res = authentication.buildParameters(state);
    expect(res).toEqual({
      query: {},
      headers: { Authorization: 'Bearer secret-jwt' },
      cookies: {},
    });
  });

  it('ignores unknown or undefined schemes', () => {
    state.ois.apiSpecifications.components.securitySchemes.myapiApiScheme.type = 'http';
    state.ois.apiSpecifications.components.securitySchemes.myapiApiScheme.scheme = undefined;
    const res = authentication.buildParameters(state);
    expect(res).toEqual({
      query: {},
      headers: {},
      cookies: {},
    });
  });
});
