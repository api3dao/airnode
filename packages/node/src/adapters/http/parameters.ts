import { Endpoint, ReservedParameterName } from '@airnode/ois';
import { ApiCallParameters } from '../../types';

export const RESERVED_PARAMETERS: string[] = Object.values(ReservedParameterName);

export function getReservedParameterValue(
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

export function getReservedParameters(endpoint: Endpoint, requestParameters: ApiCallParameters) {
  const _path = getReservedParameterValue(ReservedParameterName.Path, endpoint, requestParameters);
  const _times = getReservedParameterValue(ReservedParameterName.Times, endpoint, requestParameters);
  const _type = getReservedParameterValue(ReservedParameterName.Type, endpoint, requestParameters);
  const _relay_metadata = getReservedParameterValue(ReservedParameterName.RelayMetadata, endpoint, requestParameters);

  return { _type, _path, _times, _relay_metadata };
}
