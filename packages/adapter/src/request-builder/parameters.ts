import { ParameterTarget } from '@airnode/node/types';
import { RequestParameters, State } from '../types';
import * as authentication from './authentication';

function initalParameters(): RequestParameters {
  return {
    paths: {},
    query: {},
    headers: {},
    cookies: {},
  };
}

function appendParameter(parameters: RequestParameters, target: ParameterTarget, name: string, value: string) {
  switch (target) {
    case 'path':
      return { ...parameters, paths: { ...parameters.cookies, [name]: value } };

    case 'query':
      return { ...parameters, query: { ...parameters.query, [name]: value } };

    case 'header':
      return { ...parameters, headers: { ...parameters.headers, [name]: value } };

    case 'cookie':
      return { ...parameters, cookies: { ...parameters.cookies, [name]: value } };

    default:
      return parameters;
  }
}

function buildFixedParameters(state: State): RequestParameters {
  const { endpoint, operation } = state;

  return endpoint.fixedOperationParameters.reduce((acc, parameter) => {
    const { name, in: target } = parameter.operationParameter;

    // Double check that the parameter exists in the API specification
    const apiParameter = operation.parameters.find((ap) => ap.name === name);
    if (!apiParameter) {
      return acc;
    }

    return appendParameter(acc, target, name, parameter.value);
  }, initalParameters());
}

function buildUserParameters(state: State): RequestParameters {
  const { endpoint, operation } = state;

  const parameterKeys = Object.keys(state.parameters);

  return parameterKeys.reduce((acc, key) => {
    const parameter = endpoint.parameters.find((p) => p.name === key);
    // If the parameter is not defined in the Endpoint specification, ignore it.
    if (!parameter) {
      return acc;
    }

    // Double check that the parameter exists in the API specification
    const apiParameter = operation.parameters.find((p) => p.name === parameter.operationParameter.name);
    if (!apiParameter) {
      return acc;
    }

    const { name, in: target } = parameter.operationParameter;

    return appendParameter(acc, target, name, state.parameters[key]);
  }, initalParameters());
}

export function buildParameters(state: State): RequestParameters {
  const auth = authentication.buildParameters(state);
  const fixed = buildFixedParameters(state);
  const user = buildUserParameters(state);

  // NOTE: User parameters MUST come first otherwise they could potentially
  // overwrite fixed and authentication parameters
  return {
    paths: { ...user.paths, ...fixed.paths },
    query: { ...user.query, ...fixed.query, ...auth.query },
    headers: { ...user.headers, ...fixed.headers, ...auth.headers },
    cookies: { ...user.cookies, ...fixed.cookies, ...auth.cookies },
  };
}
