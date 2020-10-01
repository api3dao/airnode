import * as workers from '../../workers';
import { AggregatedApiCall, ApiCallError, ApiCallResponse } from '../../../types';

export type AnyApiCallResponse = Partial<ApiCallResponse & ApiCallError>;

export async function spawnNewApiCall(aggregatedApiCall: AggregatedApiCall): Promise<AnyApiCallResponse> {
  // TODO: This will probably need to change for other cloud providers
  const parameters = { aggregatedApiCall };
  const payload = workers.isLocalEnv() ? { parameters } : parameters;
  const options = { functionName: 'callApi', payload };

  // If this throws, it will be caught by the calling function
  const response = (await workers.spawn(options)) as AnyApiCallResponse;

  return response;
}
