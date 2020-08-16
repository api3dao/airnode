import * as workers from '../workers';
import { ApiCallParameters } from '../../types';

interface CallOptions {
  oisTitle: string;
  endpointName: string;
  parameters?: ApiCallParameters;
}

export interface Response {
  value: string;
}

export async function spawnNewApiCall(callOptions: CallOptions): Promise<Response> {
  // TODO: This will probably need to change for other cloud providers
  const payload = workers.isLocalEnv() ? { queryStringParameters: callOptions } : callOptions;

  const options = { functionName: 'callApi', payload };

  // If this throws, it will be caught by the calling function
  const encodedResponse = (await workers.spawn(options)) as Response;

  return encodedResponse;
}
