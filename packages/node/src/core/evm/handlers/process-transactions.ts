import { getGasPrice } from '../gas-prices';
import * as logger from '../../logger';
import * as nonces from '../../requests/nonces';
import * as state from '../../providers/state';
import * as transactions from '../transactions';
import * as utils from '../utils';
import { EVMProviderState, ProviderState } from '../../../types';

export async function processTransactions(initialState: ProviderState<EVMProviderState>) {
  const { chainId, chainType, name: providerName } = initialState.settings;
  const { coordinatorId } = initialState;

  const baseLogOptions = {
    format: initialState.settings.logFormat,
    meta: { coordinatorId, providerName, chainType, chainId },
  };

  // =================================================================
  // STEP 1: Assign nonces to processable requests
  // =================================================================
  const walletDataByIndexWithNonces = nonces.assign(initialState);
  const state1 = state.update(initialState, { walletDataByIndex: walletDataByIndexWithNonces });

  // =================================================================
  // STEP 2: Get the latest gas price
  // =================================================================
  const gasPriceOptions = {
    address: state1.contracts.GasPriceFeed,
    provider: state1.provider,
  };
  const [gasPriceLogs, gasPrice] = await getGasPrice(gasPriceOptions);
  logger.logPending(gasPriceLogs, baseLogOptions);

  const gweiPrice = utils.weiToGwei(gasPrice);
  logger.info(`Gas price set to ${gweiPrice} Gwei`, baseLogOptions);
  const state2 = state.update(state1, { gasPrice });

  // =================================================================
  // STEP 3: Submit transactions for each wallet
  // =================================================================
  const receipts = await transactions.submit(state2);
  const successfulReceipts = receipts.filter((receipt) => !!receipt.data);
  successfulReceipts.forEach((receipt) => {
    logger.info(`Transaction:${receipt.data!.hash} submitted for Request:${receipt.id}`, baseLogOptions);
  });

  // TODO: apply tx hashes to each request

  return state2;
}
