import { config } from '../config';
import * as state from './state';

export async function start() {
  // =========================================================
  // STEP 1: Get the initial state
  // =========================================================
  const state1 = await state.initialize(config.nodeSettings.ethereumProviders);

  return state1;
}
