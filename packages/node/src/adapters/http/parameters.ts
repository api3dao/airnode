import { Endpoint, ReservedParameterName } from '@api3/ois';
import { ApiCallParameters } from '../../types';

export const RESERVED_PARAMETERS = Object.values(ReservedParameterName);

export function getResponseParameterValue(
  name: ReservedParameterName,
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
  const _path = getResponseParameterValue(ReservedParameterName.Path, endpoint, requestParameters);
  const _times = getResponseParameterValue(ReservedParameterName.Times, endpoint, requestParameters);
  const _type = getResponseParameterValue(ReservedParameterName.Type, endpoint, requestParameters);

  return { _type, _path, _times };
}
