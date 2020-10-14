import { config } from '../../config';
import * as logger from '../../logger';
import { AggregatedApiCall, LogsData, RequestErrorCode } from '../../../types';

export function validateAggregatedApiCall(aggregatedApiCall: AggregatedApiCall): LogsData<AggregatedApiCall> {
  const { endpointName, id, oisTitle } = aggregatedApiCall;

  const ois = config.ois.find((o) => o.title === oisTitle);
  if (!ois) {
    const log = logger.pend('ERROR', `Unknown OIS:${oisTitle} received for Request:${id}`);
    return [[log], { ...aggregatedApiCall, errorCode: RequestErrorCode.UnknownOIS }];
  }

  const endpoint = ois.endpoints.find((e) => e.name === endpointName)!;
  if (!endpoint) {
    const log = logger.pend('ERROR', `Unknown Endpoint:${endpointName} in OIS:${oisTitle} received for Request:${id}`);
    return [[log], { ...aggregatedApiCall, errorCode: RequestErrorCode.UnknownEndpoint }];
  }

  return [[], aggregatedApiCall];
}
