import { ethers } from 'ethers';
import flatMap from 'lodash/flatMap';
import * as contracts from '../contracts';
import * as logger from '../../logger';
import { submitApiCall } from './api-calls';
import { submitWithdrawal } from './withdrawals';
import * as wallet from '../wallet';
import { EVMProviderState, ProviderState, RequestType, TransactionOptions } from '../../../types';

export interface Receipt {
  id: string;
  data?: string;
  error?: Error;
  type: RequestType;
}

export async function submit(state: ProviderState<EVMProviderState>) {
  const { chainId, chainType, name: providerName } = state.settings;
  const { coordinatorId } = state;

  const baseLogOptions = {
    format: state.settings.logFormat,
    meta: { coordinatorId, providerName, chainType, chainId },
  };

  const { Airnode } = state.contracts;
  const AirnodeABI = contracts.Airnode.ABI;

  const walletIndices = Object.keys(state.walletDataByIndex);

  const promises = flatMap(walletIndices, (index) => {
    const walletData = state.walletDataByIndex[index];
    const signingWallet = wallet.deriveSigningWalletFromIndex(state.provider, index);
    const signer = signingWallet.connect(state.provider);
    const contract = new ethers.Contract(Airnode, AirnodeABI, signer);

    const txOptions: TransactionOptions = { gasPrice: state.gasPrice!, provider: state.provider };

    // Submit transactions for API calls
    const submittedApiCalls = walletData.requests.apiCalls.map(async (apiCall) => {
      const [logs, err, data] = await submitApiCall(contract, apiCall, txOptions);
      logger.logPending(logs, baseLogOptions);
      if (err || !data) {
        return { id: apiCall.id, type: RequestType.ApiCall, error: err };
      }
      return { id: apiCall.id, type: RequestType.ApiCall, data };
    });

    // Submit transactions for withdrawals
    const submittedWithdrawals = walletData.requests.withdrawals.map(async (withdrawal) => {
      const [logs, err, data] = await submitWithdrawal(contract, withdrawal, txOptions);
      logger.logPending(logs, baseLogOptions);
      if (err || !data) {
        return { id: withdrawal.id, type: RequestType.Withdrawal, error: err };
      }
      return { id: withdrawal.id, type: RequestType.Withdrawal, data };
    });

    return [...submittedApiCalls, ...submittedWithdrawals];
  });

  const responses = await Promise.all(promises);

  return responses;
}
