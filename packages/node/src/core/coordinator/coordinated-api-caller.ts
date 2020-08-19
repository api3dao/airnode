import * as logger from '../utils/logger';
import { goTimeout } from '../utils/promise-utils';
import { spawnNewApiCall } from '../api-caller/worker';
import { AggregatedApiCall, ApiCallError, ApiCallResponse, CoordinatorState, RequestErrorCode } from '../../types';

const WORKER_TIMEOUT = 29_500;

export async function callApis(state: CoordinatorState): Promise<AggregatedApiCall[]> {
  const validAggregatedCalls = state.aggregatedApiCalls.filter((ac) => !ac.error);

  const calls = validAggregatedCalls.map(async (aggregatedApiCall) => {
    const [err, res] = await goTimeout(WORKER_TIMEOUT, spawnNewApiCall(aggregatedApiCall));
    // If the worker crashes for whatever reason, mark the request as failed
    if (err || !res) {
      return { ...aggregatedApiCall, error: { errorCode: RequestErrorCode.ApiCallFailed } };
    }

    // If the request completed but has an errorCode, then it means that something
    // went wrong. Save the errorCode and message if one exists.
    if (res.errorCode) {
      return { ...aggregatedApiCall, error: res as ApiCallError };
    }

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
