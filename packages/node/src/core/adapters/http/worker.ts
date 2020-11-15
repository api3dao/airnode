import * as workers from '../../workers';
import { AggregatedApiCall, ApiCallResponse, LogOptions, WorkerOptions } from '../../../types';

export async function spawnNewApiCall(
  aggregatedApiCall: AggregatedApiCall,
  logOptions: LogOptions,
  workerOpts: WorkerOptions
): Promise<ApiCallResponse> {
  const options = {
    ...workerOpts,
    functionName: 'callApi',
    payload: { aggregatedApiCall, logOptions },
  };

  // If this throws, it will be caught by the calling function
  const response = (await workers.spawn(options)) as ApiCallResponse;
  return response;
}
