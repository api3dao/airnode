import { initialize as initializeState } from './state';
import { Options, Request } from './types';
import * as requestBuilder from './request-builder';

export function buildRequest(options: Options): Request {
  const state = initializeState(options);

  return requestBuilder.build(state);
}
