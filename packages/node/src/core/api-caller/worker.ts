import * as workers from '../workers';
import { ApiCallParameters } from '../../types';

interface CallOptions {
  oisTitle: string;
  endpointName: string;
  parameters?: ApiCallParameters;
}

interface Response {
  value: string;
}

export async function spawnNewApiCall(callOptions: CallOptions): Promise<Response> {
  // TODO: This will probably need to change for other cloud providers
  const payload = workers.isLocalEnv() ? { queryStringParameters: callOptions } : callOptions;

  const options = { functionName: 'callApi', payload };

  // TODO: handle errors
  const encodedResponse = (await workers.spawn(options)) as Response;

  return encodedResponse;
}
