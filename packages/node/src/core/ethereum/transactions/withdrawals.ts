import { ethers } from 'ethers';
import { go } from 'src/core/utils/promise-utils';
import * as logger from 'src/core/utils/logger';
import * as wallet from 'src/core/ethereum/wallet';
import {
  ClientRequest,
  RequestStatus,
  TransactionOptions,
  Withdrawal,
} from 'src/types';

export async function submitWithdrawal(
  airnode: ethers.Contract,
  request: ClientRequest<Withdrawal>,
  options: TransactionOptions,
  index: string
) {
  if (request.status === RequestStatus.Fulfilled) {
    return null;
  }

  if (request.status === RequestStatus.Pending) {
    // The node calculates how much gas the next transaction will cost (53,654)
    const gasCost = await airnode.estimateGas.fulfillWithdrawal(request.id, {
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
    return await airnode.fulfillWithdrawal(request.id, {
      gasLimit: gasCost,
      gasPrice: state.gasPrice!,
      nonce: request.nonce!,
      value: fundsToSend,
    });
  }

  return null;
}
