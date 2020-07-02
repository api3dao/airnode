import { Operation, OracleSpecification, ParameterTarget } from '@airnode/node/types';
import { RequestParameters, UserParameters } from './types';

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

function buildFixedParameters(operation: Operation, oracle: OracleSpecification): RequestParameters {
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

function buildUserParameters(
  operation: Operation,
  oracle: OracleSpecification,
  userParameters: UserParameters
): RequestParameters {
  const keys = Object.keys(userParameters);

  return keys.reduce((acc, key) => {
    // Double check that the parameter exists in the API specification
    const apiParameter = operation.parameters.find((p) => p.name === name);
    if (!apiParameter) {
      return acc;
    }

    const parameter = oracle.parameters.find((p) => p.name === key);
    // If the parameter is not defined in the API specification, ignore it.
    if (!parameter) {
      return acc;
    }

    const { name, in: target } = parameter.operationParameter;

    return appendParameter(acc, target, name, userParameters[key]);
  }, initalParameters());
}

export function buildParameters(
  oracle: OracleSpecification,
  operation: Operation,
  userParameters: UserParameters
): RequestParameters {
  // TODO: const auth = buildAuthParameters(...);
  const fixed = buildFixedParameters(operation, oracle);
  const user = buildUserParameters(operation, oracle, userParameters);

  return {
    paths: { ...fixed.paths, ...user.paths },
    query: { ...fixed.query, ...user.query },
    cookies: { ...fixed.cookies, ...user.cookies },
    headers: { ...fixed.headers, ...user.headers },
  };
}
