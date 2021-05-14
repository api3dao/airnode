import { Endpoint } from '@api3/ois';
import { ApiCallParameters } from '../../types';

export const RESERVED_PARAMETERS = ['_path', '_times', '_type'];

export function getResponseParameterValue(
  name: string,
  endpoint: Endpoint,
  requestParameters: ApiCallParameters
): string | undefined {
  const reservedParameter = endpoint.reservedParameters.find((rp) => rp.name === name);
  // Reserved parameters must be whitelisted in order to be use, even if they have no
  // fixed or default value
  if (!reservedParameter) {
    return undefined;
  }

  if (reservedParameter.fixed) {
    return reservedParameter.fixed;
  }

  const requestParameter = requestParameters[name];
  if (!requestParameter) {
    return reservedParameter.default;
  }

  return requestParameter;
}

export function getResponseParameters(endpoint: Endpoint, requestParameters: ApiCallParameters) {
  const _path = getResponseParameterValue('_path', endpoint, requestParameters);
  const _times = getResponseParameterValue('_times', endpoint, requestParameters);
  const _type = getResponseParameterValue('_type', endpoint, requestParameters);

  return { _type, _path, _times };
}
