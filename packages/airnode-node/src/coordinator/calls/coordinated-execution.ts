import flatMap from 'lodash/flatMap';
import isEmpty from 'lodash/isEmpty';
import { go, logger, LogOptions } from '@api3/airnode-utilities';
import { spawnNewApiCall } from '../../adapters/http/worker';
import {
  LogsData,
  RequestErrorMessage,
  WorkerOptions,
  RegularAggregatedApiCall,
  RegularAggregatedApiCallWithResponse,
  RegularApiCallSuccessResponse,
} from '../../types';
import { WORKER_CALL_API_TIMEOUT } from '../../constants';

async function execute(
  aggregatedApiCall: RegularAggregatedApiCall,
  logOptions: LogOptions,
  workerOpts: WorkerOptions
): Promise<LogsData<RegularAggregatedApiCallWithResponse>> {
  const startedAt = new Date();
  const baseLogMsg = `API call to Endpoint:${aggregatedApiCall.endpointName}`;

  // NOTE: API calls are executed in separate (serverless) functions to avoid very large/malicious
  // responses from crashing the main coordinator process. We need to catch any errors here (like a timeout)
  // as a rejection here will cause Promise.all to fail
  const [err, logData] = await go(() => spawnNewApiCall(aggregatedApiCall, logOptions, workerOpts), {
    timeoutMs: WORKER_CALL_API_TIMEOUT,
  });
  const resLogs = logData ? logData[0] : [];

  const finishedAt = new Date();
  const durationMs = Math.abs(finishedAt.getTime() - startedAt.getTime());

  // If the worker crashed for whatever reason, mark the request as failed
  if (err || !logData || !logData[1]) {
    const log = logger.pend('ERROR', `${baseLogMsg} failed after ${durationMs}ms`, err);
    const updatedApiCall: RegularAggregatedApiCallWithResponse = {
      ...aggregatedApiCall,
      success: false,
      errorMessage: RequestErrorMessage.ApiCallFailed,
    };
    return [[...resLogs, log], updatedApiCall];
  }
  const res = logData[1];

  // If the request completed but has an errorCode, then it means that something
  // went wrong. Save the errorCode and message if one exists.
  if (!res.success) {
    const log = logger.pend(
      'ERROR',
      `${baseLogMsg} errored after ${durationMs}ms with error message:${res.errorMessage}`
    );
    const updatedApiCall: RegularAggregatedApiCallWithResponse = {
      ...aggregatedApiCall,
      ...res,
    };
    return [[...resLogs, log], updatedApiCall];
  }

  const completeLog = logger.pend('INFO', `${baseLogMsg} responded successfully in ${durationMs}ms`);

  // We can assume that the request was successful at this point
  const updatedApiCall: RegularAggregatedApiCallWithResponse = {
    ...aggregatedApiCall,
    ...(res as RegularApiCallSuccessResponse),
  };
  return [[...resLogs, completeLog], updatedApiCall];
}

export async function callApis(
  aggregatedApiCalls: RegularAggregatedApiCall[],
  logOptions: LogOptions,
  workerOpts: WorkerOptions
): Promise<LogsData<RegularAggregatedApiCallWithResponse[]>> {
  const pendingAggregatedCalls = aggregatedApiCalls.filter((a) => !a.errorMessage);
  const skippedAggregatedCalls = aggregatedApiCalls
    .filter((a) => a.errorMessage)
    .map((a) => ({ ...a, success: false, errorMessage: a.errorMessage! } as const));

  if (isEmpty(pendingAggregatedCalls)) {
    const log = logger.pend('INFO', 'No pending API calls to process. Skipping API calls...');
    return [[log], skippedAggregatedCalls];
  }
  const processLog = logger.pend('INFO', `Processing ${pendingAggregatedCalls.length} pending API call(s)...`);

  // Execute all pending API calls concurrently
  const calls = pendingAggregatedCalls.map(async (aggregatedApiCall) => {
    return await execute(aggregatedApiCall, logOptions, workerOpts);
  });

  const logsWithresponses = await Promise.all(calls);
  const responseLogs = flatMap(logsWithresponses, (r) => r[0]);
  const responses = flatMap(logsWithresponses, (r) => r[1]);

  const successfulResponsesCount = responses.filter((r) => r.success).length;
  const successLog = logger.pend('INFO', `Received ${successfulResponsesCount} successful API call(s)`);

  const erroredResponsesCount = responses.filter((r) => !!r.errorMessage).length;
  const errorLog = logger.pend('INFO', `Received ${erroredResponsesCount} errored API call(s)`);

  const logs = [processLog, ...responseLogs, successLog, errorLog];
  // Merge processed and skipped aggregated calls so that none are lost
  const allCalls = [...responses, ...skippedAggregatedCalls];
  return [logs, allCalls];
}
