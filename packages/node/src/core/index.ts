import { config } from './config';
import * as state from './state';

export async function main() {
  // =========================================================
  // STEP 1: Create a fresh state and initialize each
  // provider (in parallel) by fetching and setting:
  //
  //   - The network
  //   - The current block
  //   - The unfulfilled API requests
  // =========================================================
  const state1 = await state.initialize(config.nodeSettings.ethereumProviders);

  // =========================================================
  // STEP 2: Group requests and call each API
  // =========================================================
  // TODO

  return state1;
}
