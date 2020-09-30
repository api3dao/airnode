import flatMap from 'lodash/flatMap';
import * as logger from '../../logger';
import { goTimeout } from '../../utils/promise-utils';
import { spawnNewApiCall } from '../../adapters/http/worker';
import { AggregatedApiCall, ApiCallError, ApiCallResponse, LogsData, RequestErrorCode } from '../../../types';

const WORKER_TIMEOUT = 29_500;

async function execute(aggregatedApiCall: AggregatedApiCall): Promise<LogsData<AggregatedApiCall>> {
  const startedAt = new Date();
  const baseLogMsg = `API call to Endpoint:${aggregatedApiCall.endpointName}`;

  // NOTE: API calls are executed in separate (serverless) functions to avoid very large/malicious
  // responses from crashing the main coordinator process
  const [err, res] = await goTimeout(WORKER_TIMEOUT, spawnNewApiCall(aggregatedApiCall));

  const finishedAt = new Date();
  const durationMs = Math.abs(finishedAt.getTime() - startedAt.getTime());

  // If the worker crashes for whatever reason, mark the request as failed
  if (err || !res) {
    const message = `${baseLogMsg} errored after ${durationMs}. ${err}`;
    const log = logger.pend('ERROR', message);
    return [[log], { ...aggregatedApiCall, error: { errorCode: RequestErrorCode.ApiCallFailed, message } }];
  }

  // If the request completed but has an errorCode, then it means that something
  // went wrong. Save the errorCode and message if one exists.
  if (res.errorCode) {
    const log = logger.pend('ERROR', `${baseLogMsg} failed in ${durationMs}ms with error code:${res.errorCode}`);
    return [[log], { ...aggregatedApiCall, error: res as ApiCallError }];
  }

  const completeLog = logger.pend('INFO', `${baseLogMsg} responded successfully in ${durationMs}ms`);

  // We can assume that the request was successful at this point
  return [[completeLog], { ...aggregatedApiCall, response: res as ApiCallResponse }];
}

export async function callApis(aggregatedApiCalls: AggregatedApiCall[]): Promise<LogsData<AggregatedApiCall[]>> {
  const validAggregatedCalls = aggregatedApiCalls.filter((ac) => !ac.error);

  const calls = validAggregatedCalls.map(async (aggregatedApiCall) => execute(aggregatedApiCall));

  const logsWithresponses = await Promise.all(calls);
  const responseLogs = flatMap(logsWithresponses, r => r[0]);
  const responses = flatMap(logsWithresponses, r => r[1]);

  const successfulResponsesCount = responses.filter((r) => !!r.response).length;
  const successLog = logger.pend('INFO', `Received ${successfulResponsesCount} successful API call(s)`);

  const erroredResponsesCount = responses.filter((r) => !!r.error).length;
  const errorLog = logger.pend('INFO', `Received ${erroredResponsesCount} errored API call(s)`);

  const logs = [...responseLogs, successLog, errorLog];
  return [logs, responses];
}
