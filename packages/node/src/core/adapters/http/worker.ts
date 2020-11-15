import * as logger from '../../logger';
import * as workers from '../../workers';
import { go } from '../../utils/promise-utils';
import { AggregatedApiCall, ApiCallResponse, LogOptions, LogsData, WorkerOptions } from '../../../types';

export async function spawnNewApiCall(
  aggregatedApiCall: AggregatedApiCall,
  logOptions: LogOptions,
  workerOpts: WorkerOptions
): Promise<LogsData<ApiCallResponse | null>> {
  const options = {
    ...workerOpts,
    functionName: 'callApi',
    payload: { aggregatedApiCall, logOptions },
  };

  const [err, res] = await go(workers.spawn(options));
  if (err || !res) {
    const log = logger.pend('ERROR', `Unable to call API:${aggregatedApiCall.endpointName}`, err);
    return [[log], null];
  }

  if (!res.ok) {
    if (res.errorLog) {
      return [[res.errorLog], null];
    }
    const log = logger.pend('ERROR', `Unable to call API:${aggregatedApiCall.endpointName}`);
    return [[log], null];
  }
  return [[], res.data];
}
