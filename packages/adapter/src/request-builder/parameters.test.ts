import { EndpointParameter, FixedParameter } from '@airnode/node/types';
import { Options, State } from '../types';
import { initialize as initializeState } from '../state';
import * as fixtures from '../../test/__fixtures__';
import * as parameters from './parameters';

describe('building parameters', () => {
  let state: State;

  beforeEach(() => {
    state = initializeState(getOptions());
  });

  it('returns parameters', () => {
    const res = parameters.buildParameters(state);
    expect(res).toEqual({
      paths: {},
      query: {
        access_key: 'super-secret-key',
        amount: '1',
        from: 'ETH',
        to: 'USD',
      },
      headers: {},
      cookies: {},
    });
  });
});

describe('fixed parameters', () => {
  let state: State;

  beforeEach(() => {
    state = initializeState(getOptions());
  });

  it('appends parameters for each target', () => {
    const pathParameter: FixedParameter = {
      value: 'path-value',
      operationParameter: { in: 'path', name: 'path_param' }
    };

    const headerParameter: FixedParameter = {
      value: 'header-value',
      operationParameter: { in: 'header', name: 'header_param' }
    };

    const cookieParameter: FixedParameter = {
      value: 'cookie-value',
      operationParameter: { in: 'cookie', name: 'cookie_param' }
    };

    // Add to the endpoint specification
    state.endpoint.fixedOperationParameters = [
      ...state.endpoint.fixedOperationParameters,
      pathParameter,
      headerParameter,
      cookieParameter,
    ];

    // Add to the API specification
    state.operation.parameters = [
      ...state.operation.parameters,
      { name: 'path_param', in: 'path' },
      { name: 'header_param', in: 'header' },
      { name: 'cookie_param', in: 'cookie' },
    ];

    const res = parameters.buildParameters(state);
    expect(res).toEqual({
      paths: { path_param: 'path-value' },
      query: {
        access_key: 'super-secret-key',
        amount: '1',
        from: 'ETH',
        to: 'USD',
      },
      headers: { header_param: 'header-value' },
      cookies: { cookie_param: 'cookie-value' },
    });
  });

  it('ignores parameters not defined in the API specification', () => {
    // Erases the 'from' parameter
    state.ois.apiSpecifications.paths['/convert'].get.parameters[0].name = 'unknown';
    const res = parameters.buildParameters(state);
    expect(res).toEqual({
      paths: {},
      query: {
        access_key: 'super-secret-key',
        amount: '1',
        to: 'USD',
      },
      headers: {},
      cookies: {},
    });
  });
});

describe('user parameters', () => {
  let state: State;

  beforeEach(() => {
    state = initializeState(getOptions());
  });

  it('appends parameters for each target', () => {
    const pathParameter: EndpointParameter = {
      name: 'p',
      operationParameter: { in: 'path', name: 'path_param' }
    };

    const headerParameter: EndpointParameter = {
      name: 'h',
      operationParameter: { in: 'header', name: 'header_param' }
    };

    const cookieParameter: EndpointParameter = {
      name: 'c',
      operationParameter: { in: 'cookie', name: 'cookie_param' }
    };

    // Add to the endpoint specification
    state.endpoint.parameters = [
      ...state.endpoint.parameters,
      pathParameter,
      headerParameter,
      cookieParameter,
    ];

    // Add to the API specification
    state.operation.parameters = [
      ...state.operation.parameters,
      { name: 'path_param', in: 'path' },
      { name: 'header_param', in: 'header' },
      { name: 'cookie_param', in: 'cookie' },
    ];

    // Add to the parameters that get sent at run-time from the user
    state.parameters = {
      ...state.parameters,
      p: 'path-key',
      h: 'header-key',
      c: 'cookie-key',
    };

    const res = parameters.buildParameters(state);
    expect(res).toEqual({
      paths: { path_param: 'path-key' },
      query: {
        access_key: 'super-secret-key',
        amount: '1',
        from: 'ETH',
        to: 'USD',
      },
      headers: { header_param: 'header-key' },
      cookies: { cookie_param: 'cookie-key' },
    });
  });

  it('ignores parameters not defined in the API specification', () => {
    // Erases the 'to' parameter
    state.ois.apiSpecifications.paths['/convert'].get.parameters[1].name = 'unknown';
    const res = parameters.buildParameters(state);
    expect(res).toEqual({
      paths: {},
      query: {
        access_key: 'super-secret-key',
        amount: '1',
        from: 'ETH',
      },
      headers: {},
      cookies: {},
    });
  });

  it('ignores parameters not defined in the endpoint specification', () => {
    // Erases the 'from' parameter
    state.endpoint.parameters![0].name = 'unknown';
    const res = parameters.buildParameters(state);
    expect(res).toEqual({
      paths: {},
      query: {
        access_key: 'super-secret-key',
        amount: '1',
        to: 'USD',
      },
      headers: {},
      cookies: {},
    });
  });
});

function getOptions(): Options {
  const options: Options = {
    ois: fixtures.ois,
    endpointName: 'convertToUsd',
    parameters: { f: 'ETH', amount: '1' },
    securitySchemes: fixtures.securitySchemes,
  };
  // Get a fresh clone to prevent updating references between tests
  return JSON.parse(JSON.stringify(options));
}
