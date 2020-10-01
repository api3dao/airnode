
import { getGasPrice } from '../gas-prices';
import * as logger from '../../logger';
import * as nonces from '../../requests/nonces';
import * as state from '../../providers/state';
import * as transactions from '../transactions';
import * as utils from '../utils';
import { ChainType, EVMProviderState, LogFormat, ProviderState } from '../../../types';

export async function processTransactions(initialState: ProviderState<EVMProviderState>) {
  const baseLogOptions = {
    format: 'plain' as LogFormat,
    meta: {
      chainId: initialState.settings.chainId,
      chainType: 'evm' as ChainType,
      coordinatorId: initialState.coordinatorId,
      providerName: initialState.settings.name,
    },
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
    address: contracts.GasPriceFeed.addresses[state1.config.chainId],
    provider: state1.provider,
  };
  const [gasPriceLogs, gasPrice] = await getGasPrice(gasPriceOptions);
  logger.logPendingMessages(state1.config.name, gasPriceLogs);

  const gweiPrice = utils.weiToGwei(gasPrice);
  logger.logProviderJSON(state1.config.name, 'INFO', `Gas price set to ${gweiPrice} Gwei`);
  const state2 = state.update(state1, { gasPrice });

  // =================================================================
  // STEP 3: Submit transactions for each wallet
  // =================================================================
  const receipts = await transactions.submit(state2);
  const successfulReceipts = receipts.filter((receipt) => !!receipt.data);
  successfulReceipts.forEach((receipt) => {
    logger.info(`Transaction:${receipt.data!.hash} submitted for Request:${receipt.id}`, baseLogOptions);
  });

  return receipts;
} 
