import { logger, getLogOptions } from '@api3/airnode-utilities';
import { go } from '@api3/promise-utils';
import * as workers from '../../workers';
import { ApiCallResponse, LogsData, WorkerOptions, CallApiPayload, RegularAggregatedApiCall } from '../../types';

export async function spawnNewApiCall(
  aggregatedApiCall: RegularAggregatedApiCall,
  workerOpts: WorkerOptions
): Promise<LogsData<ApiCallResponse | null>> {
  const options = {
    ...workerOpts,
    payload: { aggregatedApiCall, logOptions: getLogOptions(), functionName: 'callApi' } as CallApiPayload,
  };

  const goRes = await go(() => workers.spawn(options));
  if (!goRes.success) {
    const log = logger.pend('ERROR', `Unable to call API endpoint:${aggregatedApiCall.endpointName}`, goRes.error);
    return [[log], null];
  }
  if (!goRes.data) {
    const log = logger.pend('ERROR', `Unable to call API endpoint:${aggregatedApiCall.endpointName}`);
    return [[log], null];
  }

  const res = goRes.data;

  if (!res.ok) {
    if (res.errorLog) {
      return [[res.errorLog], null];
    }
    const log = logger.pend('ERROR', `Unable to call API endpoint:${aggregatedApiCall.endpointName}`);
    return [[log], null];
  }
  return [[], res.data];
}
