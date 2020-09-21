import * as logger from '../../logger';
import { goTimeout } from '../../utils/promise-utils';
import { spawnNewApiCall } from '../../adapters/http/worker';
import { AggregatedApiCall, ApiCallError, ApiCallResponse, CoordinatorState, RequestErrorCode } from '../../../types';

const WORKER_TIMEOUT = 29_500;

export async function callApis(state: CoordinatorState): Promise<AggregatedApiCall[]> {
  const validAggregatedCalls = state.aggregatedApiCalls.filter((ac) => !ac.error);

  const calls = validAggregatedCalls.map(async (aggregatedApiCall) => {
    const startedAt = new Date();
    const logMsg = `API call to Endpoint:${aggregatedApiCall.endpointName}`;

    const [err, res] = await goTimeout(WORKER_TIMEOUT, spawnNewApiCall(aggregatedApiCall));

    const finishedAt = new Date();
    const durationMs = Math.abs(finishedAt.getTime() - startedAt.getTime());

    // If the worker crashes for whatever reason, mark the request as failed
    if (err || !res) {
      const message = `${logMsg} errored after ${durationMs}. ${err}`;
      logger.logJSON('ERROR', message);
      return { ...aggregatedApiCall, error: { errorCode: RequestErrorCode.ApiCallFailed, message } };
    }

    // If the request completed but has an errorCode, then it means that something
    // went wrong. Save the errorCode and message if one exists.
    if (res.errorCode) {
      logger.logJSON('ERROR', `${logMsg} failed in ${durationMs}ms with error code:${res.errorCode}`);
      return { ...aggregatedApiCall, error: res as ApiCallError };
    }

    logger.logJSON('INFO', `${logMsg} responded successfully in ${durationMs}ms`);

    // We can assume that the request was successful at this point
    return { ...aggregatedApiCall, response: res as ApiCallResponse };
  });

  const responses = await Promise.all(calls);

  const successfulResponsesCount = responses.filter((r) => !!r.response).length;
  logger.logJSON('INFO', `Received ${successfulResponsesCount} successful API call(s)`);

  const erroredResponsesCount = responses.filter((r) => !!r.error).length;
  logger.logJSON('INFO', `Received ${erroredResponsesCount} errored API call(s)`);

  return responses;
}
