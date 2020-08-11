import adapter from '@airnode/adapter';
import { config, security } from '../config';
import { go } from '../utils/promise-utils';
import * as logger from '../utils/logger';
import { CoordinatorState } from '../../types';

interface CallOptions {
  apiTitle: string;
  endpointName: string;
  parameters?: { [key: string]: string };
  responseParameters: adapter.ResponseParameters;
}

interface Response {
  status: number;
  value: string;
}

async function callApi(callOptions: CallOptions): Promise<Response> {
  const ois = config.ois.find(o => o.title === callOptions.apiTitle)!;
  const securitySchemes = security.apiCredentials[callOptions.apiTitle];

  const options: adapter.Options = {
    endpointName: callOptions.endpointName,
    parameters: callOptions.parameters || {},
    ois,
    securitySchemes,
  };

  const [err, res] = await go(adapter.buildAndExecuteRequest(options));
  if (err) {
    logger.logJSON('ERROR', `Failed to call endpoint:${callOptions.endpointName}`);
    // TODO: handle errors
  }

  const { encodedValue } = adapter.extractAndEncodeResponse(res, callOptions.responseParameters);

  return { status: 200, value: encodedValue };
}

export function callApis(state: CoordinatorState) {
  const { apiCalls } = state.requests;

  const endpointIds = apiCalls.map(ac => ac.endpointId!);
}
