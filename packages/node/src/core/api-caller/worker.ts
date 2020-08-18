import * as workers from '../workers';
import { AggregatedApiCall, ErroredApiCallResponse, SuccessfulApiCallResponse } from '../../types';

export type AnyApiCallResponse = Partial<SuccessfulApiCallResponse & ErroredApiCallResponse>;

export async function spawnNewApiCall(aggregatedApiCall: AggregatedApiCall): Promise<AnyApiCallResponse> {
  // TODO: This will probably need to change for other cloud providers
  // TODO: queryStringParameters is probably not right...
  const payload = workers.isLocalEnv() ? { queryStringParameters: { aggregatedApiCall } } : aggregatedApiCall;

  const options = { functionName: 'callApi', payload };

  // If this throws, it will be caught by the calling function
  const response = (await workers.spawn(options)) as AnyApiCallResponse;

  return response;
}
