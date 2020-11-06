import * as workers from '../../workers';
import { AggregatedApiCall, ApiCallResponse, Config, LogOptions } from '../../../types';

export async function spawnNewApiCall(
  config: Config,
  aggregatedApiCall: AggregatedApiCall,
  logOptions: LogOptions
): Promise<ApiCallResponse> {
  const payload = { aggregatedApiCall, logOptions };
  const options = { config, functionName: 'callApi', payload };

  // If this throws, it will be caught by the calling function
  const response = (await workers.spawn(options)) as ApiCallResponse;

  return response;
}
