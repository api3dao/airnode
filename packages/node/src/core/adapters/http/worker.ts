import * as workers from '../../workers';
import { AggregatedApiCall, ApiCallResponse, LogOptions } from '../../../types';

export async function spawnNewApiCall(
  aggregatedApiCall: AggregatedApiCall,
  logOptions: LogOptions
): Promise<ApiCallResponse> {
  // TODO: This will probably need to change for other cloud providers
  const parameters = { aggregatedApiCall, logOptions };
  const payload = workers.isLocalEnv() ? { parameters } : parameters;
  const options = { functionName: 'callApi', payload };

  // If this throws, it will be caught by the calling function
  const response = (await workers.spawn(options)) as ApiCallResponse;

  return response;
}
