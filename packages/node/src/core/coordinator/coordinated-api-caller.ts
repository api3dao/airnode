import { config } from '../config';
import * as logger from '../utils/logger';
import { goTimeout } from '../utils/promise-utils';
import { spawnNewApiCall } from '../api-caller/worker';
import { CoordinatorState, ErroredApiCallResponse, RequestErrorCode, SuccessfulApiCallResponse } from '../../types';

const WORKER_TIMEOUT = 29_500;

export async function callApis(state: CoordinatorState) {
  // Map all of the API calls that were initiated by ClientRequests
  // We need to fetch specific details from the trigger
  const apiCallRequests = state.aggregatedApiCalls
    .filter((ac) => ac.type === 'request')
    .map((ac) => {
      const trigger = config.triggers.requests.find((r) => r.endpointId === ac.endpointId)!;
      return { ...ac, oisTitle: trigger.oisTitle, endpointName: trigger.endpointName };
    });

  const calls = apiCallRequests.map(async (apiCall) => {
    const [err, res] = await goTimeout(WORKER_TIMEOUT, spawnNewApiCall(apiCall));
    // If the worker crashes for whatever reason, mark the request as failed
    if (err || !res) {
      return { ...apiCall, error: { errorCode: RequestErrorCode.ApiCallFailed } };
    }

    // If the request completed but has an errorCode, then it means that something
    // went wrong. Save the errorCode and message if one exists.
    if (res.errorCode) {
      return { ...apiCall, error: res as ErroredApiCallResponse };
    }

    // We can assume that the request was successful at this point
    return { ...apiCall, response: res as SuccessfulApiCallResponse };
  });

  const responses = await Promise.all(calls);

  const successfulResponsesCount = responses.filter((r) => !!r.response).length;
  logger.logJSON('INFO', `Received ${successfulResponsesCount} successful API call(s)`);

  const erroredResponsesCount = responses.filter((r) => !!r.error).length;
  logger.logJSON('INFO', `Received ${erroredResponsesCount} errored API call(s)`);

  return responses;
}
