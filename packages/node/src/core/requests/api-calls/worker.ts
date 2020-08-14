import * as workers from '../../workers';
import { ApiCallParameters } from '../../../types';

interface CallOptions {
  oisTitle: string;
  endpointName: string;
  parameters?: ApiCallParameters;
}

export async function spawnNewApiCall(callOptions: CallOptions): Promise<string> {
  // TODO: This will probably need to change for other cloud providers
  const payload = workers.isLocalEnv() ? { queryStringParameters: callOptions } : callOptions;

  const parameters = { functionName: 'callApi', payload };

  // If this throws, it will be caught by the calling function
  const encodedResponse = (await workers.spawn(parameters)) as string;

  return encodedResponse;
}
