import flatMap from 'lodash/flatMap';
import * as logger from '../../logger';
import { goTimeout } from '../../utils/promise-utils';
import { spawnNewApiCall } from '../../adapters/http/worker';
import {
  AggregatedApiCall,
  AggregatedApiCallsById,
  Config,
  LogsData,
  LogOptions,
  RequestErrorCode,
} from '../../../types';

const WORKER_TIMEOUT = 29_500;

async function execute(
  config: Config,
  aggregatedApiCall: AggregatedApiCall,
  logOptions: LogOptions
): Promise<LogsData<AggregatedApiCall>> {
  const startedAt = new Date();
  const baseLogMsg = `API call to Endpoint:${aggregatedApiCall.endpointName}`;

  // NOTE: API calls are executed in separate (serverless) functions to avoid very large/malicious
  // responses from crashing the main coordinator process
  const [err, res] = await goTimeout(WORKER_TIMEOUT, spawnNewApiCall(config, aggregatedApiCall, logOptions));

  const finishedAt = new Date();
  const durationMs = Math.abs(finishedAt.getTime() - startedAt.getTime());

  // If the worker crashes for whatever reason, mark the request as failed
  if (err || !res) {
    const log = logger.pend('ERROR', `${baseLogMsg} failed after ${durationMs}ms`, err);
    return [[log], { ...aggregatedApiCall, errorCode: RequestErrorCode.ApiCallFailed }];
  }

  // If the request completed but has an errorCode, then it means that something
  // went wrong. Save the errorCode and message if one exists.
  if (res.errorCode) {
    const log = logger.pend('ERROR', `${baseLogMsg} errored after ${durationMs}ms with error code:${res.errorCode}`);
    return [[log], { ...aggregatedApiCall, errorCode: res.errorCode as RequestErrorCode }];
  }

  const completeLog = logger.pend('INFO', `${baseLogMsg} responded successfully in ${durationMs}ms`);

  // We can assume that the request was successful at this point
  return [[completeLog], { ...aggregatedApiCall, responseValue: res.value as string }];
}

function regroupAggregatedCalls(aggregatedApiCalls: AggregatedApiCall[]): AggregatedApiCallsById {
  return aggregatedApiCalls.reduce((acc, aggregatedApiCall) => {
    const existingAggregatedCalls = acc[aggregatedApiCall.id] || [];

    return {
      ...acc,
      [aggregatedApiCall.id]: [...existingAggregatedCalls, aggregatedApiCall],
    };
  }, {});
}

export async function callApis(
  config: Config,
  aggregatedApiCallsById: AggregatedApiCallsById,
  logOptions: LogOptions
): Promise<LogsData<AggregatedApiCallsById>> {
  // Flatten all aggregated API calls and filter out ones that already have an error
  const flatAggregatedCalls = flatMap(Object.keys(aggregatedApiCallsById), (id) => aggregatedApiCallsById[id]);
  const validAggregatedCalls = flatAggregatedCalls.filter((ac) => !ac.errorCode);

  const calls = validAggregatedCalls.map(async (aggregatedApiCall) => execute(config, aggregatedApiCall, logOptions));

  const logsWithresponses = await Promise.all(calls);
  const responseLogs = flatMap(logsWithresponses, (r) => r[0]);
  const responses = flatMap(logsWithresponses, (r) => r[1]);
  const regroupedResponses = regroupAggregatedCalls(responses);

  const successfulResponsesCount = responses.filter((r) => !!r.responseValue).length;
  const successLog = logger.pend('INFO', `Received ${successfulResponsesCount} successful API call(s)`);

  const erroredResponsesCount = responses.filter((r) => !!r.errorCode).length;
  const errorLog = logger.pend('INFO', `Received ${erroredResponsesCount} errored API call(s)`);

  const logs = [...responseLogs, successLog, errorLog];
  return [logs, regroupedResponses];
}
