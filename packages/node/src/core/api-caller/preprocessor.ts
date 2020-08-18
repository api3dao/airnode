import { config } from '../config';
import * as logger from '../utils/logger';
import { AggregatedApiCall, CoordinatorState, RequestErrorCode } from '../../types';

export function validateAggregatedApiCall(aggregatedApiCall: AggregatedApiCall): AggregatedApiCall {
  const { endpointName, id, oisTitle } = aggregatedApiCall;

  if (!oisTitle || !endpointName) {
    const message = `OIS or Endpoint not found for Request:${id}`;
    logger.logJSON('ERROR', message);
    const error = { errorCode: RequestErrorCode.InvalidOIS, message };
    return { ...aggregatedApiCall, error };
  }

  const ois = config.ois.find(o => o.title === oisTitle);
  if (!ois) {
    const message = `OIS:${oisTitle} not found for Request:${id}`;
    logger.logJSON('ERROR', message);
    const error = { errorCode: RequestErrorCode.InvalidOIS, message };
    return { ...aggregatedApiCall, error };
  }

  const endpoint = ois.endpoints.find((e) => e.name === endpointName)!;
  if (!endpoint) {
    const message = `Endpoint:${endpointName} not found in OIS:${oisTitle} for Request:${id}`;
    logger.logJSON('ERROR', message);
    const error = { errorCode: RequestErrorCode.InvalidOIS, message };
    return { ...aggregatedApiCall, error };
  }

  return aggregatedApiCall;
}

export function validateAllAggregatedCalls(state: CoordinatorState): AggregatedApiCall[] {
  return state.aggregatedApiCalls.map((aggregatedApiCall) => {
    return validateAggregatedApiCall(aggregatedApiCall);
  });
}
