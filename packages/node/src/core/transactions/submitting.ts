import { ethers } from 'ethers';
import flatMap from 'lodash/flatMap';
import * as ethereum from '../ethereum';
import * as wallet from '../ethereum/wallet';
import * as logger from '../utils/logger';
import { goTimeout } from '../utils/promise-utils';
import {
  ApiCall,
  BaseRequest,
  ClientRequest,
  ProviderState,
  RequestStatus,
  WalletDesignation,
  Withdrawal,
} from '../../types';

async function submitApiCall(state: ProviderState, request: ClientRequest<ApiCall>, chainAPI: ethers.Contract) {
  // No need to log anything if the request is already fulfilled
  if (request.status === RequestStatus.Fulfilled) {
    return {};
  }

  if (request.status === RequestStatus.Errored) {
    logger.logProviderJSON(state.config.name, 'INFO', `Erroring API call for Request:${request.id}...`);
    return await chainAPI.error(request.id, request.errorCode, request.errorAddress, request.errorFunctionId);
  }

  if (request.status === RequestStatus.Pending) {
    logger.logProviderJSON(state.config.name, 'INFO', `Fulfilling API call for Request:${request.id}...`);
    return await chainAPI.fulfill(
      request.id,
      request.response?.value,
      request.fulfillAddress,
      request.fulfillFunctionId,
      {
        gasPrice: state.gasPrice!,
        gasLimit: 500000, // For some reason, the default gas limit is too high
      }
    );
  }

  logger.logProviderJSON(
    state.config.name,
    'INFO',
    `API call for Request:${request.id} not actioned as it has status:${request.status}`
  );

  return {};
}

async function submitWalletDesignation(
  state: ProviderState,
  request: BaseRequest<WalletDesignation>,
  chainAPI: ethers.Contract
) {
  if (request.status === RequestStatus.Fulfilled) {
    return {};
  }

  if (request.status === RequestStatus.Pending) {
    logger.logProviderJSON(state.config.name, 'INFO', `Fulfilling wallet designation for Request:${request.id}...`);
    return await chainAPI.fulfillWalletDesignation(request.id, request.walletIndex, {
      gasPrice: state,
      gasLimit: 150000,
    });
  }

  logger.logProviderJSON(
    state.config.name,
    'INFO',
    `API call for Request:${request.id} not actioned as it has status:${request.status}`
  );

  return {};
}

async function submitWithdrawal(
  state: ProviderState,
  request: ClientRequest<Withdrawal>,
  chainAPI: ethers.Contract,
  index: string
) {
  if (request.status === RequestStatus.Fulfilled) {
    return {};
  }

  if (request.status === RequestStatus.Pending) {
    // The node calculates how much gas the next transaction will cost (53,654)
    const gasCost = await chainAPI.estimateGas.fulfillWithdrawal(request.id, {
      // We need to send some funds for the gas price calculation to be correct
      value: 1,
    });

    const txCost = gasCost.mul(state.gasPrice!);
    // We set aside some ETH to pay for the gas of the following transaction,
    // send all the rest along with the transaction. The contract will direct
    // these funds to the destination given at the request.
    const xpub = wallet.getExtendedPublicKey();
    const requesterAddress = wallet.deriveWalletAddressFromIndex(xpub, index);
    const reservedWalletBalance = await state.provider.getBalance(requesterAddress);
    const fundsToSend = reservedWalletBalance.sub(txCost);

    logger.logProviderJSON(state.config.name, 'INFO', `Fulfilling withdrawal for Request:${request.id}...`);

    // Note that we're using the requester wallet to call this
    return await chainAPI.fulfillWithdrawal(request.id, {
      gasLimit: gasCost,
      gasPrice: state.gasPrice!,
      value: fundsToSend,
    });
  }

  return {};
}

export async function submit(state: ProviderState) {
  const { name } = state.config;
  const { Airnode } = ethereum.contracts;

  const walletIndices = Object.keys(state.walletDataByIndex);

  const promises = flatMap(walletIndices, (index) => {
    const walletData = state.walletDataByIndex[index];
    const signingWallet = wallet.deriveSigningWalletFromIndex(state.provider, index);
    const signer = signingWallet.connect(state.provider);
    const contract = new ethers.Contract(Airnode.addresses[state.config.chainId], Airnode.ABI, signer);

    const submittedApiCalls = walletData.requests.apiCalls.map(async (apiCall) => {
      const [err, res] = await goTimeout(4000, submitApiCall(state, apiCall, contract));
      if (err || !res) {
        logger.logProviderJSON(
          name,
          'ERROR',
          `Failed to submit transaction for API call Request:${apiCall.id}. ${err}`
        );
        return null;
      }
      logger.logProviderJSON(name, 'INFO', `Submitted tx:${res.hash} for API call Request:${apiCall.id}`);
      return { id: apiCall.id, type: 'api-call', transactionHash: res.hash };
    });

    const submittedWalletDesignations = walletData.requests.walletDesignations.map(async (walletDesignation) => {
      const [err, res] = await goTimeout(4000, submitWalletDesignation(state, walletDesignation, contract));
      if (err || !res) {
        logger.logProviderJSON(
          name,
          'ERROR',
          `Failed to submit transaction for wallet designation Request:${walletDesignation.id}. ${err}`
        );
        return null;
      }
      logger.logProviderJSON(
        name,
        'INFO',
        `Submitted tx:${res.hash} for wallet designation Request:${walletDesignation.id}`
      );
      return { id: walletDesignation.id, type: 'wallet-designation', transactionHash: res.hash };
    });

    const submittedWithdrawals = walletData.requests.withdrawals.map(async (withdrawal) => {
      const [err, res] = await goTimeout(4000, submitWithdrawal(state, withdrawal, contract, index));
      if (err || !res) {
        logger.logProviderJSON(
          name,
          'ERROR',
          `Failed to submit transaction for withdrawal Request:${withdrawal.id}. ${err}`
        );
        return null;
      }
      logger.logProviderJSON(name, 'INFO', `Submitted tx:${res.hash} for withdrawal Request:${withdrawal.id}`);
      return { id: withdrawal.id, type: 'withdrawal', transactionHash: res.hash };
    });

    return [...submittedApiCalls, ...submittedWalletDesignations, ...submittedWithdrawals];
  });

  const receipts = await Promise.all(promises);

  return receipts;
}
