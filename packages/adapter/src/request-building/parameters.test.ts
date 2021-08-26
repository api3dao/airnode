/* eslint-disable functional/immutable-data */

import { EndpointParameter, FixedParameter } from '@api3/ois';
import * as parameters from './parameters';
import * as fixtures from '../../test/fixtures';

describe('building parameters', () => {
  it('returns parameters', () => {
    const options = fixtures.buildCacheRequestOptions();
    const res = parameters.buildParameters(options);
    expect(res).toEqual({
      paths: {},
      query: {
        access_key: 'super-secret-key',
        amount: '1',
        from: 'ETH',
        to: 'USD',
      },
      headers: {},
    });
  });
});

describe('fixed parameters', () => {
  it('appends parameters for each target', () => {
    const pathParameter: FixedParameter = {
      value: 'path-value',
      operationParameter: { in: 'path', name: 'path_param' },
    };
    const headerParameter: FixedParameter = {
      value: 'header-value',
      operationParameter: { in: 'header', name: 'header_param' },
    };
    const cookieParameter: FixedParameter = {
      value: 'cookie-value',
      operationParameter: { in: 'cookie', name: 'cookie_param' },
    };
    const options = fixtures.buildCacheRequestOptions();
    // Add to the endpoint specification
    options.endpoint.fixedOperationParameters = [
      ...options.endpoint.fixedOperationParameters,
      pathParameter,
      headerParameter,
      cookieParameter,
    ];
    // Add to the API specification
    options.operation.parameters = [
      ...options.operation.parameters,
      { name: 'path_param', in: 'path' },
      { name: 'header_param', in: 'header' },
      { name: 'cookie_param', in: 'cookie' },
    ];
    const res = parameters.buildParameters(options);
    expect(res).toEqual({
      paths: { path_param: 'path-value' },
      query: {
        access_key: 'super-secret-key',
        amount: '1',
        from: 'ETH',
        to: 'USD',
      },
      headers: {
        Cookie: 'cookie_param=cookie-value;',
        header_param: 'header-value',
      },
    });
  });

  it('ignores parameters not defined in the API specification', () => {
    const ois = fixtures.buildOIS();
    // Erases the 'from' parameter
    ois.apiSpecifications.paths['/convert'].get.parameters[0].name = 'unknown';
    const options = fixtures.buildCacheRequestOptions({ ois });
    const res = parameters.buildParameters(options);
    expect(res).toEqual({
      paths: {},
      query: {
        access_key: 'super-secret-key',
        amount: '1',
        from: 'ETH',
        to: 'USD',
      },
      headers: {},
    });
  });
});

describe('user parameters', () => {
  it('appends parameters for each target', () => {
    const pathParameter: EndpointParameter = {
      name: 'p',
      operationParameter: { in: 'path', name: 'path_param' },
    };
    const headerParameter: EndpointParameter = {
      name: 'h',
      operationParameter: { in: 'header', name: 'header_param' },
    };
    const cookieParameter: EndpointParameter = {
      name: 'c',
      operationParameter: { in: 'cookie', name: 'cookie_param' },
    };
    const options = fixtures.buildCacheRequestOptions();
    // Add to the endpoint specification
    options.endpoint.parameters = [...options.endpoint.parameters, pathParameter, headerParameter, cookieParameter];
    // Add to the API specification
    options.operation.parameters = [
      ...options.operation.parameters,
      { name: 'path_param', in: 'path' },
      { name: 'header_param', in: 'header' },
      { name: 'cookie_param', in: 'cookie' },
    ];
    // Add to the parameters that get sent at run-time from the user
    const allParameters = {
      ...options.parameters,
      p: 'path-key',
      h: 'header-key',
      c: 'cookie-key',
    };
    const updatedOptions = { ...options, parameters: allParameters };
    const res = parameters.buildParameters(updatedOptions);
    expect(res).toEqual({
      paths: { path_param: 'path-key' },
      query: {
        access_key: 'super-secret-key',
        amount: '1',
        from: 'ETH',
        to: 'USD',
      },
      headers: {
        Cookie: 'cookie_param=cookie-key;',
        header_param: 'header-key',
      },
    });
  });

  it('ignores parameters not defined in the API specification', () => {
    const options = fixtures.buildCacheRequestOptions();
    // Erases the 'to' parameter
    options.ois.apiSpecifications.paths['/convert'].get.parameters[1].name = 'unknown';
    const res = parameters.buildParameters(options);
    expect(res).toEqual({
      paths: {},
      query: {
        access_key: 'super-secret-key',
        amount: '1',
        from: 'ETH',
      },
      headers: {},
    });
  });

  it('ignores parameters not defined in the endpoint specification', () => {
    const options = fixtures.buildCacheRequestOptions();
    // Erases the 'from' parameter
    options.endpoint.parameters![0].name = 'unknown';
    const res = parameters.buildParameters(options);
    expect(res).toEqual({
      paths: {},
      query: {
        access_key: 'super-secret-key',
        amount: '1',
        to: 'USD',
      },
      headers: {},
    });
  });
});

describe('relay metadata parameters', () => {
  it('appends parameters to query', () => {
    const options = fixtures.buildCacheRequestOptions({
      metadataParameters: {
        _airnode_airnode_address: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
        _airnode_requester_address: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        _airnode_sponsor_wallet: '0xB604c9f7de852F26DB90C04000820850112905b4',
        _airnode_endpoint_id: '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353',
        _airnode_sponsor_address: '0x7a9a6F6B21AEE3b905AEeC757bbBcA39747Ca4Fa',
        _airnode_request_id: '0xcf2816af81f9cc7c9879dc84ce29c00fe1e290bcb8d2e4b204be1eeb120811bf',
        _airnode_chain_id: '31337',
        _airnode_chain_type: 'evm',
        _airnode_airnode_rrp: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      },
    });
    const res = parameters.buildParameters(options);
    expect(res).toEqual({
      paths: {},
      query: {
        access_key: 'super-secret-key',
        amount: '1',
        from: 'ETH',
        to: 'USD',
        _airnode_airnode_address: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
        _airnode_requester_address: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        _airnode_sponsor_wallet: '0xB604c9f7de852F26DB90C04000820850112905b4',
        _airnode_endpoint_id: '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353',
        _airnode_sponsor_address: '0x7a9a6F6B21AEE3b905AEeC757bbBcA39747Ca4Fa',
        _airnode_request_id: '0xcf2816af81f9cc7c9879dc84ce29c00fe1e290bcb8d2e4b204be1eeb120811bf',
        _airnode_chain_id: '31337',
        _airnode_chain_type: 'evm',
        _airnode_airnode_rrp: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      },
      headers: {},
    });
  });
});
