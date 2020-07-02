import { ApiSpecification, OIS, Operation, OracleSpecification } from '@airnode/node/src/core/config/types';
import { Options } from '../types';
import { Request, UserParams } from './types';

function buildFixedParameters(api: ApiSpecification, oracle: OracleSpecification, path: Operation) {
  const initalParams = {
    query: {},
    headers: {},
    cookie: {},
  };

  return oracle.fixedOperationParameters.reduce((acc, parameter) => {
    const { name, in: target } = parameter.operationParameter;

    // Double check that the parameter exists in the API specification
    const apiParameter = path.parameters.find((ap) => ap.name === name);

    if (!apiParameter) {
      return acc;
    }

    if (target === 'query') {
      return { ...acc, query: { ...acc.query, [name]: parameter.value } };
    }
    return acc;
  }, initalParams);
}

export function build(ois: OIS, options: Options): Request {
  const api = ois.apiSpecifications;
  const { method } = options;

  const path = api.paths[options.path][method];
  const oracle = ois.oracleSpecifications.find((os) => os.name === options.oracleName);

  // A single base URL should always exist in one of these places
  const baseUrl = path.servers ? path.servers[0].url : api.servers![0].url;

  const fixedParameters = oracleSpec?.fixedOperationParameters.map();

  return {
    baseUrl,
    path: options.path,
    method,
  };
}
