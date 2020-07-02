import isEmpty from 'lodash/isEmpty';
import { OIS } from '@airnode/node/src/core/config/types';
import { Options } from '../types';
import { Request } from './types';
import { buildParameters } from './parameters';

export function build(ois: OIS, options: Options): Request {
  const api = ois.apiSpecifications;
  const { method } = options;

  const operation = api.paths[options.path][method];
  const oracle = ois.oracleSpecifications.find((os) => os.name === options.oracleName);
  if (!oracle) {
    throw new Error(`Oracle specification: '${options.oracleName}' not found.`);
  }

  // A single base URL should always exist in one of these places
  const baseUrl = operation.servers ? operation.servers[0].url : api.servers![0].url;

  const parameters = buildParameters(oracle, operation, options.userParameters);
  const path = isEmpty(parameters.paths) ? options.path : parsePathWithParameters(options.path);

  return {
    baseUrl,
    path: options.path,
    method,
    headers: 
  };
}
