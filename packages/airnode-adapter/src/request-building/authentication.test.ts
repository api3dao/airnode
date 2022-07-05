import { ApiKeySecurityScheme, ApiSecurityScheme, ApiSpecification } from '@api3/ois';
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
    (ois.apiSpecifications.components.securitySchemes.myApiSecurityScheme as ApiKeySecurityScheme).in = 'header';
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
    (ois.apiSpecifications.components.securitySchemes.myApiSecurityScheme as ApiKeySecurityScheme).in = 'cookie';
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
    ois.apiSpecifications.components.securitySchemes.myApiSecurityScheme = scheme;
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
    ois.apiSpecifications.components.securitySchemes.myApiSecurityScheme = scheme;
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
    const scheme: ApiSecurityScheme = { in: 'header', type: 'relayChainId', name: 'myChainId' };
    ois.apiSpecifications.components.securitySchemes.myApiSecurityScheme = scheme;
    const options = fixtures.buildCacheRequestOptions({ ois });
    const res = authentication.buildParameters(options);
    expect(res).toEqual({
      query: {},
      headers: { myChainId: '31337' },
      cookies: {},
    });
  });

  it('relays chain type', () => {
    const ois = fixtures.buildOIS();
    const scheme: ApiSecurityScheme = { in: 'cookie', type: 'relayChainType', name: 'myChainType' };
    ois.apiSpecifications.components.securitySchemes.myApiSecurityScheme = scheme;
    const options = fixtures.buildCacheRequestOptions({ ois });
    const res = authentication.buildParameters(options);
    expect(res).toEqual({
      query: {},
      headers: {},
      cookies: { myChainType: 'evm' },
    });
  });

  it('relays requester address', () => {
    const ois = fixtures.buildOIS();
    const scheme: ApiSecurityScheme = { in: 'query', type: 'relayRequesterAddress', name: 'myRequesterAddress' };
    ois.apiSpecifications.components.securitySchemes.myApiSecurityScheme = scheme;
    const options = fixtures.buildCacheRequestOptions({ ois });
    const res = authentication.buildParameters(options);
    expect(res).toEqual({
      query: { myRequesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' },
      headers: {},
      cookies: {},
    });
  });

  it('relays sponsor address', () => {
    const ois = fixtures.buildOIS();
    const scheme: ApiSecurityScheme = { in: 'query', type: 'relaySponsorAddress', name: 'mySponsorAddress' };
    ois.apiSpecifications.components.securitySchemes.myApiSecurityScheme = scheme;
    const options = fixtures.buildCacheRequestOptions({ ois });
    const res = authentication.buildParameters(options);
    expect(res).toEqual({
      query: { mySponsorAddress: '0x7a9a6F6B21AEE3b905AEeC757bbBcA39747Ca4Fa' },
      headers: {},
      cookies: {},
    });
  });

  it('relays sponsor wallet address', () => {
    const ois = fixtures.buildOIS();
    const scheme: ApiSecurityScheme = {
      in: 'query',
      type: 'relaySponsorWalletAddress',
      name: 'mySponsorWalletAddress',
    };
    ois.apiSpecifications.components.securitySchemes.myApiSecurityScheme = scheme;
    const options = fixtures.buildCacheRequestOptions({ ois });
    const res = authentication.buildParameters(options);
    expect(res).toEqual({
      query: { mySponsorWalletAddress: '0xB604c9f7de852F26DB90C04000820850112905b4' },
      headers: {},
      cookies: {},
    });
  });

  it('relays request Id', () => {
    const ois = fixtures.buildOIS();
    const scheme: ApiSecurityScheme = {
      in: 'query',
      type: 'relayRequestId',
      name: 'myRequestId',
    };
    ois.apiSpecifications.components.securitySchemes.myApiSecurityScheme = scheme;
    const options = fixtures.buildCacheRequestOptions({ ois });
    const res = authentication.buildParameters(options);
    expect(res).toEqual({
      query: { myRequestId: '0xcf2816af81f9cc7c9879dc84ce29c00fe1e290bcb8d2e4b204be1eeb120811bf' },
      headers: {},
      cookies: {},
    });
  });
});
