import * as workers from '../workers';
import { ApiCallParameters, ErroredApiCallResponse, SuccessfulApiCallResponse } from '../../types';

interface CallOptions {
  oisTitle: string;
  endpointName: string;
  parameters?: ApiCallParameters;
}

export type AnyApiCallResponse = Partial<SuccessfulApiCallResponse & ErroredApiCallResponse>;

export async function spawnNewApiCall(callOptions: CallOptions): Promise<AnyApiCallResponse> {
  // TODO: This will probably need to change for other cloud providers
  const payload = workers.isLocalEnv() ? { queryStringParameters: callOptions } : callOptions;

  const options = { functionName: 'callApi', payload };

  // If this throws, it will be caught by the calling function
  const response = (await workers.spawn(options)) as AnyApiCallResponse;

  return response;
}
