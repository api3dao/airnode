import { Endpoint, ReservedParameterName } from '@api3/ois';
import { ApiCallParameters } from '../../types';

export function getReservedParameterValue(
  name: ReservedParameterName,
  endpoint: Endpoint,
  requestParameters: ApiCallParameters
): string | undefined {
  const reservedParameter = endpoint.reservedParameters.find((rp) => rp.name === name);
  // Reserved parameters must be whitelisted in order to be used, even if they have no fixed or default value
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

export function getReservedParameters(endpoint: Endpoint, requestParameters: ApiCallParameters) {
  const _path = getReservedParameterValue('_path', endpoint, requestParameters);
  const _times = getReservedParameterValue('_times', endpoint, requestParameters);
  const _type = getReservedParameterValue('_type', endpoint, requestParameters);
  const _gasPrice = getReservedParameterValue('_gasPrice', endpoint, requestParameters);

  return { _type, _path, _times, _gasPrice };
}
