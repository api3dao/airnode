import { getGasPrice } from '../gas-prices';
import * as fulfillments from '../fulfillments';
import * as logger from '../../logger';
import * as nonces from '../../requests/nonces';
import * as state from '../../providers/state';
import * as utils from '../utils';
import { EVMProviderState, GroupedRequests, ProviderState } from '../../types';

export async function processTransactions(
  initialState: ProviderState<EVMProviderState>
): Promise<ProviderState<EVMProviderState>> {
  const { chainId, chainType, chainOptions, name: providerName } = initialState.settings;
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
  const gasPriceOptions = { provider: state2.provider, chainOptions };
  const [gasPriceLogs, gasTarget] = await getGasPrice(gasPriceOptions);
  logger.logPending(gasPriceLogs, baseLogOptions);

  if (!gasTarget) {
    logger.error('Unable to submit transactions without gas price. Returning...', baseLogOptions);
    return state2;
  }

  if (chainOptions.txType === '2') {
    const gweiMaxFee = utils.weiToGwei(gasTarget.maxFeePerGas!);
    const gweiPriorityFee = utils.weiToGwei(gasTarget.maxPriorityFeePerGas!);
    logger.info(
      `Gas price (EIP-1559) set to a Max Fee of ${gweiMaxFee} Gwei and a Priority Fee of ${gweiPriorityFee} Gwei`,
      baseLogOptions
    );
  } else {
    const gweiPrice = utils.weiToGwei(gasTarget.gasPrice!);
    logger.info(`Gas price (non EIP-1559) set to ${gweiPrice} Gwei`, baseLogOptions);
  }

  const state3 = state.update(state2, { gasTarget });

  // =================================================================
  // STEP 4: Submit transactions for each wallet
  // =================================================================
  const receipts = await fulfillments.submit(state3);
  const successfulReceipts = receipts.filter((receipt) => !!receipt.data);
  successfulReceipts.forEach((receipt) => {
    logger.info(`Transaction:${receipt.data!.hash} submitted for Request:${receipt.id}`, baseLogOptions);
  });

  const requestsWithFulfillments: GroupedRequests = {
    apiCalls: fulfillments.applyFulfillments(state3.requests.apiCalls, successfulReceipts),
    withdrawals: fulfillments.applyFulfillments(state3.requests.withdrawals, successfulReceipts),
  };
  const state4 = state.update(state3, { requests: requestsWithFulfillments });

  return state4;
}
