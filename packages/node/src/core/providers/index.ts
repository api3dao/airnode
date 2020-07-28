import { go } from '../utils/promise-utils';
import { ProviderConfig, ProviderState } from '../../types';
import * as logger from '../utils/logger';
import * as requestHandler from '../triggers/requests';
import * as state from './state';

export async function initializeState(config: ProviderConfig, index: number): Promise<ProviderState | null> {
  const state1 = state.create(config, index);

  // =========================================================
  // STEP 1: Get the current block number
  // =========================================================
  const [blockErr, currentBlock] = await go(state1.provider.getBlockNumber());
  if (blockErr || !currentBlock) {
    logger.logProviderError(config.name, 'Unable to get current block', blockErr);
    return null;
  }
  logger.logProviderJSON(config.name, 'INFO', `Current block set to: ${currentBlock}`);
  const state2 = state.update(state1, { currentBlock });

  // =========================================================
  // STEP 2: Get the pending requests
  //
  // TODO: aggregator requests will be fetched in
  // parallel with this at a later point
  // =========================================================
  const [requestsErr, requests] = await go(requestHandler.fetchPendingRequests(state2));
  if (requestsErr || !requests) {
    logger.logProviderError(config.name, 'Unable to get pending requests', requestsErr);
    return null;
  }
  const state3 = state.update(state2, { requests });

  // =========================================================
  // STEP 3: Get any templates and apply them
  // =========================================================
  // TODO:

  return state3;
}
