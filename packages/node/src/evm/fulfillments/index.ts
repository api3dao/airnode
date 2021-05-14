import flatMap from 'lodash/flatMap';
import * as grouping from '../../requests/grouping';
import * as logger from '../../logger';
import { submitApiCall } from './api-calls';
import { submitWithdrawal } from './withdrawals';
import * as wallet from '../wallet';
import {
  ClientRequest,
  EVMProviderState,
  ProviderState,
  RequestType,
  TransactionOptions,
  TransactionReceipt,
} from '../../types';
import { AirnodeRrpFactory } from '../contracts';

export async function submit(state: ProviderState<EVMProviderState>): Promise<TransactionReceipt[]> {
  const { chainId, chainType, name: providerName } = state.settings;
  const { coordinatorId } = state;

  const baseLogOptions = {
    format: state.settings.logFormat,
    level: state.settings.logLevel,
    meta: { coordinatorId, providerName, chainType, chainId },
  };

  const { AirnodeRrp } = state.contracts;

  const requestsByRequesterIndex = grouping.groupRequestsByRequesterIndex(state.requests);

  const requesterIndices = Object.keys(requestsByRequesterIndex);

  const promises = flatMap(requesterIndices, (index) => {
    const requests = requestsByRequesterIndex[index];
    const signingWallet = wallet.deriveSigningWalletFromIndex(state.masterHDNode, index);
    const signer = signingWallet.connect(state.provider);
    const contract = AirnodeRrpFactory.connect(AirnodeRrp, signer);

    const txOptions: TransactionOptions = {
      gasPrice: state.gasPrice!,
      masterHDNode: state.masterHDNode,
      provider: state.provider,
    };

    // Submit transactions for API calls
    const submittedApiCalls = requests.apiCalls.map(async (apiCall) => {
      const [logs, err, data] = await submitApiCall(contract, apiCall, txOptions);
      logger.logPending(logs, baseLogOptions);
      if (err || !data) {
        return { id: apiCall.id, type: RequestType.ApiCall, error: err };
      }
      return { id: apiCall.id, type: RequestType.ApiCall, data };
    });

    // Submit transactions for withdrawals
    const submittedWithdrawals = requests.withdrawals.map(async (withdrawal) => {
      const [logs, err, data] = await submitWithdrawal(contract, withdrawal, txOptions);
      logger.logPending(logs, baseLogOptions);
      if (err || !data) {
        return { id: withdrawal.id, type: RequestType.Withdrawal, error: err };
      }
      return { id: withdrawal.id, type: RequestType.Withdrawal, data };
    });

    return [...submittedApiCalls, ...submittedWithdrawals];
  });

  const receipts = (await Promise.all(promises)) as TransactionReceipt[];
  return receipts;
}

export function applyFulfillments<T>(requests: ClientRequest<T>[], receipts: TransactionReceipt[]) {
  return requests.reduce((acc, request) => {
    const receipt = receipts.find((r) => r.id === request.id);
    if (!receipt || !receipt.data?.hash) {
      return [...acc, request];
    }
    const updatedRequest = { ...request, fulfillment: { hash: receipt.data.hash } };
    return [...acc, updatedRequest];
  }, [] as ClientRequest<T>[]);
}
