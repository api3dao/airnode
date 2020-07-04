import { Options, State } from './types';

export function initialize(options: Options): State {
  const { method, ois } = options;
  const api = ois.apiSpecifications;
  const operation = api.paths[options.path][method];

  const oracleSpecification = ois.oracleSpecifications.find((os) => os.name === options.oracleSpecName);
  if (!oracleSpecification) {
    throw new Error(`Oracle specification: '${options.oracleSpecName}' not found.`);
  }

  return { ...options, operation, oracleSpecification };
}
