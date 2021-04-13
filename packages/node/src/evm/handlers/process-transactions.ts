import { getGasPrice } from '../gas-prices';
import * as fulfillments from '../fulfillments';
import * as logger from '../../logger';
import * as nonces from '../../requests/nonces';
import * as state from '../../providers/state';
import * as utils from '../utils';
import { EVMProviderState, ProviderState } from '../../types';

export async function processTransactions(
  initialState: ProviderState<EVMProviderState>
): Promise<ProviderState<EVMProviderState>> {
  const { chainId, chainType, name: providerName } = initialState.settings;
  const { coordinatorId } = initialState;

  const baseLogOptions = {
    format: initialState.settings.logFormat,
    level: initialState.settings.logLevel,
    meta: { coordinatorId, providerName, chainType, chainId },
  };

  // =================================================================
  // STEP 1: Re-instantiate any classes
  // =================================================================
  const state1 = state.refresh(initialState);

  // =================================================================
  // STEP 2: Assign nonces to processable requests
  // =================================================================
  const requestsWithNonces = nonces.assign(initialState);
  const state2 = state.update(state1, { requests: requestsWithNonces });

  // =================================================================
  // STEP 3: Get the latest gas price
  // =================================================================
  const gasPriceOptions = { provider: state2.provider };
  const [gasPriceLogs, gasPrice] = await getGasPrice(gasPriceOptions);
  logger.logPending(gasPriceLogs, baseLogOptions);

  if (!gasPrice) {
    logger.error('Cannot submit transactions with gas price. Returning...', baseLogOptions);
    return state2;
  }

  const gweiPrice = utils.weiToGwei(gasPrice);
  logger.info(`Gas price set to ${gweiPrice} Gwei`, baseLogOptions);
  const state3 = state.update(state2, { gasPrice });

  // =================================================================
  // STEP 4: Submit transactions for each wallet
  // =================================================================
  const receipts = await fulfillments.submit(state3);
  const successfulReceipts = receipts.filter((receipt) => !!receipt.data);
  successfulReceipts.forEach((receipt) => {
    logger.info(`Transaction:${receipt.data!.hash} submitted for Request:${receipt.id}`, baseLogOptions);
  });

  // TODO: apply tx hashes to each request

  return state3;
}
