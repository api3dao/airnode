import { Endpoint } from '@airnode/ois';
import { ApiCallParameters } from '../../types';

export function getResponseParameterValue(
  name: string,
  endpoint: Endpoint,
  requestParameters: ApiCallParameters
): string | undefined {
  const reservedParameter = endpoint.reservedParameters.find((rp) => rp.name === name);
  if (!reservedParameter) {
    return requestParameters[name];
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
  // Check before making the API call in case the parameters are missing
  const _path = getResponseParameterValue('_path', endpoint, requestParameters);
  const _times = getResponseParameterValue('_times', endpoint, requestParameters);
  const _type = getResponseParameterValue('_type', endpoint, requestParameters);

  return {
    _type,
    _path,
    _times: _times ? Number(_times) : undefined,
  };
}
