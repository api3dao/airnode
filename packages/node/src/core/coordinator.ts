import { config } from './config';
import * as state from './state';
import { fetch } from './handlers/requests';

export async function start() {
  // TODO: split into separate forked processes
  const { providers } = await state.initialize(config.nodeSettings.ethereumProviders);

  await fetch(providers[2]);

  return providers;
}
