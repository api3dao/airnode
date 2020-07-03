import { State } from '../types';
import { buildParameters } from './parameters';
import { parsePathWithParameters } from './path-parser';

export function build(state: State): Request {
  const { ois, method } = state;

  // A single base URL should always exist at the API level
  // Different base URLs are not supported at the operation level
  const baseUrl = ois.apiSpecifications.servers[0].url;

  const parameters = buildParameters(state);
  const path = parsePathWithParameters(state.path, parameters.paths);

  return {
    baseUrl,
    path,
    method,
    headers: parameters.headers,
  };
}
