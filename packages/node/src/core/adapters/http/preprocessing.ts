import { config } from '../../config';
import * as logger from '../../logger';
import { AggregatedApiCall, CoordinatorState, RequestErrorCode } from '../../../types';

export function validateAggregatedApiCall(aggregatedApiCall: AggregatedApiCall): AggregatedApiCall {
  const { endpointName, id, oisTitle } = aggregatedApiCall;

  const ois = config.ois.find((o) => o.title === oisTitle);
  if (!ois) {
    const message = `Unknown OIS:${oisTitle} received for Request:${id}`;
    logger.logJSON('ERROR', message);
    const error = { errorCode: RequestErrorCode.UnknownOIS, message };
    return { ...aggregatedApiCall, error };
  }

  const endpoint = ois.endpoints.find((e) => e.name === endpointName)!;
  if (!endpoint) {
    const message = `Unknown Endpoint:${endpointName} in OIS:${oisTitle} received for Request:${id}`;
    logger.logJSON('ERROR', message);
    const error = { errorCode: RequestErrorCode.UnknownEndpoint, message };
    return { ...aggregatedApiCall, error };
  }

  return aggregatedApiCall;
}

export function validateAllAggregatedCalls(state: CoordinatorState): AggregatedApiCall[] {
  return state.aggregatedApiCalls.map((aggregatedApiCall) => {
    return validateAggregatedApiCall(aggregatedApiCall);
  });
}
