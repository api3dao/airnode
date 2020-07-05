import { initialize as initializeState } from './state';
import { Options } from './types';
import * as requestBuilder from './request-builder';

export function run(options: Options) {
  const state = initializeState(options);

  requestBuilder.build(state);
}
