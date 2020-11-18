import flatMap from 'lodash/flatMap';
import * as logger from '../../logger';
import { goTimeout } from '../../utils/promise-utils';
import { spawnNewApiCall } from '../../adapters/http/worker';
import {
  AggregatedApiCall,
  AggregatedApiCallsById,
  LogsData,
  LogOptions,
  RequestErrorCode,
  WorkerOptions,
} from '../../../types';

const WORKER_TIMEOUT = 29_500;

async function execute(
  aggregatedApiCall: AggregatedApiCall,
  logOptions: LogOptions,
  workerOpts: WorkerOptions
): Promise<LogsData<AggregatedApiCall>> {
  const startedAt = new Date();
  const baseLogMsg = `API call to Endpoint:${aggregatedApiCall.endpointName}`;

  // NOTE: API calls are executed in separate (serverless) functions to avoid very large/malicious
  // responses from crashing the main coordinator process. We need to catch any errors here (like a timeout)
  // as a rejection here will cause Promise.all to fail
  const [err, logData] = await goTimeout(WORKER_TIMEOUT, spawnNewApiCall(aggregatedApiCall, logOptions, workerOpts));
  const resLogs = logData ? logData[0] : [];

  const finishedAt = new Date();
  const durationMs = Math.abs(finishedAt.getTime() - startedAt.getTime());

  // If the worker crashed for whatever reason, mark the request as failed
  if (err || !logData || !logData[1]) {
    const log = logger.pend('ERROR', `${baseLogMsg} failed after ${durationMs}ms`, err);
    const updatedApiCall = { ...aggregatedApiCall, errorCode: RequestErrorCode.ApiCallFailed };
    return [[...resLogs, log], updatedApiCall];
  }
  const res = logData[1];

  // If the request completed but has an errorCode, then it means that something
  // went wrong. Save the errorCode and message if one exists.
  if (res.errorCode) {
    const log = logger.pend('ERROR', `${baseLogMsg} errored after ${durationMs}ms with error code:${res.errorCode}`);
    const updatedApiCall = { ...aggregatedApiCall, errorCode: res.errorCode as RequestErrorCode };
    return [[...resLogs, log], updatedApiCall];
  }

  const completeLog = logger.pend('INFO', `${baseLogMsg} responded successfully in ${durationMs}ms`);

  // We can assume that the request was successful at this point
  const updatedApiCall = { ...aggregatedApiCall, responseValue: res.value as string };
  return [[...resLogs, completeLog], updatedApiCall];
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
  aggregatedApiCallsById: AggregatedApiCallsById,
  logOptions: LogOptions,
  workerOpts: WorkerOptions
): Promise<LogsData<AggregatedApiCallsById>> {
  // Flatten all aggregated API calls and filter out ones that already have an error
  const flatAggregatedCalls = flatMap(Object.keys(aggregatedApiCallsById), (id) => aggregatedApiCallsById[id]);
  const validAggregatedCalls = flatAggregatedCalls.filter((ac) => !ac.errorCode);

  // Execute all API calls concurrently
  const calls = validAggregatedCalls.map(async (aggregatedApiCall) => {
    return await execute(aggregatedApiCall, logOptions, workerOpts);
  });

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
