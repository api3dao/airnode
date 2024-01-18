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
    ois.apiSpecifications.paths['/convert'].get!.parameters[0].name = 'unknown';
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

  it('ignores parameters without operationParameter', () => {
    const ois = fixtures.buildOIS();
    ois.apiSpecifications.paths['/convert'].get!.parameters.push({ in: 'query', name: 'noOperationParameter' });
    const options = fixtures.buildCacheRequestOptions({
      ois,
      parameters: { f: 'ETH', amount: '1', no_op: 'myValue' },
    });
    options.endpoint.parameters.push({
      name: 'no_op',
      // operationParameter is absent
    });
    options.operation.parameters.push({ name: 'noOperationParameter', in: 'query' });
    const res = parameters.buildParameters(options);
    expect(res).toEqual({
      paths: {},
      query: {
        // Expectedly absent:
        // noOperationParameter: 'myValue',
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
    options.ois.apiSpecifications.paths['/convert'].get!.parameters[1].name = 'unknown';
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
