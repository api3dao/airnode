import { Operation, OracleSpecification, ParameterTarget } from '@airnode/node/types';
import { Parameters, RequestParameters, State } from '../types';

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
  const { operation, oracleSpecification: oracle } = state;

  return oracle.fixedOperationParameters.reduce((acc, parameter) => {
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
  const { operation, oracleSpecification: oracle } = state;

  const parameterKeys = Object.keys(state.parameters);

  return parameterKeys.reduce((acc, key) => {
    // Double check that the parameter exists in the API specification
    const apiParameter = operation.parameters.find((p) => p.name === name);
    if (!apiParameter) {
      return acc;
    }

    const parameter = oracle.parameters.find((p) => p.name === key);
    // If the parameter is not defined in the Oracle specification, ignore it.
    if (!parameter) {
      return acc;
    }

    const { name, in: target } = parameter.operationParameter;

    return appendParameter(acc, target, name, state.parameters[key]);
  }, initalParameters());
}

export function buildParameters(state: State): RequestParameters {
  // TODO: const auth = buildAuthParameters(...);
  const fixed = buildFixedParameters(state);
  const user = buildUserParameters(state);

  // NOTE: Fixed parameters must come last otherwise they could potentially be
  // overwritten by user parameters
  return {
    paths: { ...user.paths, ...fixed.paths },
    query: { ...user.query, ...fixed.query },
    cookies: { ...user.cookies, ...fixed.cookies },
    headers: { ...user.headers, ...fixed.headers },
  };
}
