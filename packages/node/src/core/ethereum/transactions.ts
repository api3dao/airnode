import { ethers } from 'ethers';
import flatMap from 'lodash/flatMap';
import { go } from 'src/core/utils/promise-utils';
import * as contracts from 'src/core/ethereum/contracts';
import * as logger from 'src/core/utils/logger';
import { submitApiCall } from 'src/core/ethereum/transactions/api-calls';
import { submitWalletDesignation } from 'src/core/ethereum/transactions/wallet-designations';
import { submitWithdrawal } from 'src/core/ethereum/transactions/withdrawals';
import * as wallet from 'src/core/ethereum/wallet';
import { ProviderState, RequestType } from 'src/types';

export interface Receipt {
  id: string;
  transactionHash: string;
  type: RequestType;
}

export async function submit(state: ProviderState) {
  const { name } = state.config;
  const { Airnode } = contracts;

  const walletIndices = Object.keys(state.walletDataByIndex);

  const promises = flatMap(walletIndices, (index) => {
    const walletData = state.walletDataByIndex[index];
    const signingWallet = wallet.deriveSigningWalletFromIndex(state.provider, index);
    const signer = signingWallet.connect(state.provider);
    const contract = new ethers.Contract(Airnode.addresses[state.config.chainId], Airnode.ABI, signer);
    const submitOptions = { gasPrice: state.gasPrice!, logs: [] };

    // Submit transactions for API calls
    const submittedApiCalls = walletData.requests.apiCalls.map(async (apiCall) => {
      const res = await submitApiCall(contract, apiCall, submitOptions);
      logger.logPendingMessages(state.config.name, res.logs);
      return { id: apiCall.id, type: RequestType.ApiCall, transactionHash: res.data?.hash };
    });

    // Submit transactions for withdrawals
    const submittedWithdrawals = walletData.requests.withdrawals.map(async (withdrawal) => {
      const [err, res] = await go(submitWithdrawal(state, withdrawal, contract, index));
      if (err || !res) {
        logger.logProviderJSON(
          name,
          'ERROR',
          `Failed to submit transaction for withdrawal Request:${withdrawal.id}. ${err}`
        );
        return null;
      }
      logger.logProviderJSON(name, 'INFO', `Submitted tx:${res.hash} for withdrawal Request:${withdrawal.id}`);
      return { id: withdrawal.id, type: RequestType.Withdrawal, transactionHash: res.hash };
    });

    // Submit transactions for wallet designations
    const submittedWalletDesignations = walletData.requests.walletDesignations.map(async (walletDesignation) => {
      const res = await submitWalletDesignation(contract, walletDesignation, submitOptions);
      logger.logPendingMessages(state.config.name, res.logs);
      return { id: walletDesignation.id, type: RequestType.WalletDesignation, transactionHash: res.data?.hash };
    });

    return [...submittedApiCalls, ...submittedWithdrawals, ...submittedWalletDesignations];
  });

  const receipts = await Promise.all(promises);
  const sucessfulReceipts = receipts.filter((r) => !!r) as Receipt[];

  return sucessfulReceipts;
}
