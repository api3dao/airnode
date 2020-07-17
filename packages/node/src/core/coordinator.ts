import { config } from './config';
import * as state from './state';
import * as requests from './handlers/requests';

export async function start() {
  // TODO: split into separate forked processes
  const { providers } = await state.initialize(config.nodeSettings.ethereumProviders);

  return providers;
}
