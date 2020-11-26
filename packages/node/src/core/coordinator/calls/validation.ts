import flatMap from 'lodash/flatMap';
import * as logger from '../../logger';
import {
  AggregatedApiCall,
  AggregatedApiCallsById,
  Config,
  LogsData,
  PendingLog,
  RequestErrorCode,
} from '../../../types';

export function validateAggregatedApiCall(
  config: Config,
  aggregatedApiCall: AggregatedApiCall
): LogsData<AggregatedApiCall> {
  const { endpointName, id, oisTitle } = aggregatedApiCall;

  const ois = config.ois.find((o) => o.title === oisTitle);
  if (!ois) {
    const log = logger.pend('ERROR', `Unknown OIS:${oisTitle} received for Request:${id}`);
    const updatedCall = { ...aggregatedApiCall, errorCode: RequestErrorCode.UnknownOIS };
    return [[log], updatedCall];
  }

  const endpoint = ois.endpoints.find((e) => e.name === endpointName)!;
  if (!endpoint) {
    const log = logger.pend('ERROR', `Unknown Endpoint:${endpointName} in OIS:${oisTitle} received for Request:${id}`);
    const updatedCall = { ...aggregatedApiCall, errorCode: RequestErrorCode.UnknownEndpoint };
    return [[log], updatedCall];
  }

  return [[], aggregatedApiCall];
}

interface ValidationResult {
  aggregatedApiCallsById: AggregatedApiCallsById;
  logs: PendingLog[];
}

export function validateAggregatedApiCalls(
  config: Config,
  aggregatedApiCallsById: AggregatedApiCallsById
): LogsData<AggregatedApiCallsById> {
  const flatAggregatedCalls = flatMap(Object.keys(aggregatedApiCallsById), (id) => aggregatedApiCallsById[id]);

  const initialState: ValidationResult = { aggregatedApiCallsById: {}, logs: [] };
  const validated = flatAggregatedCalls.reduce((acc, aggregatedApiCall) => {
    const [validationLogs, validatedAggApiCall] = validateAggregatedApiCall(config, aggregatedApiCall);

    const updatedAggregatedCallsById = {
      ...acc.aggregatedApiCallsById,
      [validatedAggApiCall.id]: validatedAggApiCall,
    };

    const updatedLogs = [...acc.logs, ...validationLogs];

    return { logs: updatedLogs, aggregatedApiCallsById: updatedAggregatedCallsById };
  }, initialState);

  return [validated.logs, validated.aggregatedApiCallsById];
}
