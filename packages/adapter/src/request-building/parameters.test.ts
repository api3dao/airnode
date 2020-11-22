import { EndpointParameter, FixedParameter } from '@airnode/ois';
import { CachedBuildRequestOptions } from '../types';
import * as fixtures from '../../test/fixtures';
import * as parameters from './parameters';

describe('building parameters', () => {
  let options: CachedBuildRequestOptions;

  beforeEach(() => {
    options = initializeState(fixtures.getOptions());
  });

  it('returns parameters', () => {
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
  let state: State;

  beforeEach(() => {
    state = initializeState(fixtures.getOptions());
  });

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
      headers: {
        Cookie: 'cookie_param=cookie-value;',
        header_param: 'header-value',
      },
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
    });
  });
});

describe('user parameters', () => {
  let state: State;

  beforeEach(() => {
    state = initializeState(fixtures.getOptions());
  });

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

    // Add to the endpoint specification
    state.endpoint.parameters = [...state.endpoint.parameters, pathParameter, headerParameter, cookieParameter];

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
      headers: {
        Cookie: 'cookie_param=cookie-key;',
        header_param: 'header-key',
      },
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
    });
  });
});
