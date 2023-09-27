import { ParameterTarget } from '@api3/ois';
import * as authentication from './authentication';
import * as cookies from './cookies';
import { BuilderParameters, CachedBuildRequestOptions, RequestParameters } from '../types';

function initialParameters(): BuilderParameters {
  return {
    paths: {},
    query: {},
    headers: {},
    cookies: {},
  };
}

function appendParameter(
  parameters: BuilderParameters,
  target: ParameterTarget,
  name: string,
  value: string
): BuilderParameters {
  switch (target) {
    case 'path':
      return { ...parameters, paths: { ...parameters.paths, [name]: value } };

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

function buildFixedParameters(options: CachedBuildRequestOptions): BuilderParameters {
  const { endpoint, operation } = options;

  return endpoint.fixedOperationParameters.reduce((acc, parameter) => {
    const { name, in: target } = parameter.operationParameter;

    // Double check that the parameter exists in the API specification
    const apiParameter = operation.parameters.find((ap) => ap.name === name);
    if (!apiParameter) {
      return acc;
    }

    return appendParameter(acc, target, name, parameter.value);
  }, initialParameters());
}

function buildUserParameters(options: CachedBuildRequestOptions): BuilderParameters {
  const { endpoint, operation, parameters } = options;

  const parameterKeys = Object.keys(parameters);

  return parameterKeys.reduce((acc, key) => {
    const parameter = endpoint.parameters.find((p) => p.name === key);
    // If the parameter is not defined in the Endpoint specification, ignore it.
    if (!parameter) {
      return acc;
    }

    // Double check that the parameter exists in the API specification
    const apiParameter = operation.parameters.find(
      (p) =>
        parameter.operationParameter &&
        p.name === parameter.operationParameter.name &&
        p.in === parameter.operationParameter.in
    );
    if (!apiParameter || !parameter.operationParameter) {
      return acc;
    }

    const { name, in: target } = parameter.operationParameter;

    return appendParameter(acc, target, name, parameters[key]);
  }, initialParameters());
}

export function buildParameters(options: CachedBuildRequestOptions): RequestParameters {
  const auth = authentication.buildParameters(options);
  const fixed = buildFixedParameters(options);
  const user = buildUserParameters(options);

  const cookie = cookies.buildHeader({ ...user.cookies, ...fixed.cookies, ...auth.cookies });

  // NOTE: User parameters MUST come first otherwise they could potentially
  // overwrite fixed and authentication parameters
  return {
    paths: { ...user.paths, ...fixed.paths },
    query: { ...user.query, ...fixed.query, ...auth.query },
    headers: { ...user.headers, ...fixed.headers, ...auth.headers, ...cookie },
  };
}
