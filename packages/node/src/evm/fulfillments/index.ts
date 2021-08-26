import { Transaction } from 'ethers';
import flatten from 'lodash/flatten';
import { submitApiCall } from './api-calls';
import { submitWithdrawal } from './withdrawals';
import * as grouping from '../../requests/grouping';
import * as logger from '../../logger';
import * as wallet from '../wallet';
import {
  Request,
  EVMProviderState,
  ProviderState,
  RequestStatus,
  RequestType,
  TransactionOptions,
  TransactionReceipt,
} from '../../types';
import { AirnodeRrpFactory } from '../contracts';

export interface Receipt {
  readonly id: string;
  readonly data?: string;
  readonly error?: Error;
  readonly type: RequestType;
}

interface RequestReceipt {
  readonly id: string;
  readonly type: RequestType;
  readonly data?: Transaction;
  readonly err?: Error | null;
}

// eslint-disable-next-line functional/no-mixed-type
interface OrderedRequest {
  readonly nonce: number;
  readonly makeRequest: () => Promise<RequestReceipt>;
}

/**
 * Sponsor requests are performed from the sponsor wallet. Each transaction has a fixed nonce and blochchain rejects out
 * of order transactions.
 *
 * This function makes all the sponsor requests sequentially (ordered by transaction nonce increasingly).
 *
 * There is a concept of batched requests, but that doesn't work with transactions. See:
 * https://github.com/ethers-io/ethers.js/issues/892#issuecomment-828897859
 */
const submitSponsorRequestsSequentially = async (state: ProviderState<EVMProviderState>, sponsorAddress: string) => {
  const { chainId, chainType, name: providerName } = state.settings;
  const { coordinatorId } = state;

  const baseLogOptions = {
    format: state.settings.logFormat,
    level: state.settings.logLevel,
    meta: { coordinatorId, providerName, chainType, chainId },
  };

  const { AirnodeRrp } = state.contracts;
  const requestsBySponsorAddress = grouping.groupRequestsBySponsorAddress(state.requests);
  const requests = requestsBySponsorAddress[sponsorAddress];
  const sponsorWallet = wallet.deriveSponsorWallet(state.masterHDNode, sponsorAddress);
  const signer = sponsorWallet.connect(state.provider);
  const contract = AirnodeRrpFactory.connect(AirnodeRrp, signer);

  const txOptions: TransactionOptions = {
    gasPrice: state.gasPrice!,
    masterHDNode: state.masterHDNode,
    provider: state.provider,
  };

  // Submit transactions for API calls
  const submittedApiCalls = requests.apiCalls.map((apiCall): OrderedRequest => {
    const makeRequest = async () => {
      const [logs, err, data] = await submitApiCall(contract, apiCall, txOptions);
      logger.logPending(logs, baseLogOptions);
      if (err || !data) {
        return { id: apiCall.id, type: RequestType.ApiCall, error: err };
      }
      return { id: apiCall.id, type: RequestType.ApiCall, data };
    };

    return {
      nonce: apiCall.nonce!,
      makeRequest,
    };
  });

  // Submit transactions for withdrawals
  const submittedWithdrawals = requests.withdrawals.map((withdrawal): OrderedRequest => {
    const makeRequest = async () => {
      const [logs, err, data] = await submitWithdrawal(contract, withdrawal, txOptions);
      logger.logPending(logs, baseLogOptions);
      if (err || !data) {
        return { id: withdrawal.id, type: RequestType.Withdrawal, error: err };
      }
      return { id: withdrawal.id, type: RequestType.Withdrawal, data };
    };

    return {
      nonce: withdrawal.nonce!,
      makeRequest,
    };
  });

  const allRequests = [...submittedApiCalls, ...submittedWithdrawals];
  // Sort by the nonce value increasingly
  allRequests.sort((a, b) => a.nonce - b.nonce);

  const receipts: RequestReceipt[] = [];
  // Perform the requests sequentially to in order to respect the nonce value
  //
  // eslint-disable-next-line functional/no-loop-statement
  for (const request of allRequests) {
    receipts.push(await request.makeRequest());
  }

  return receipts;
};

export async function submit(state: ProviderState<EVMProviderState>) {
  const requestsBySponsorAddress = grouping.groupRequestsBySponsorAddress(state.requests);
  const sponsorAddresses = Object.keys(requestsBySponsorAddress);

  const promises = sponsorAddresses.map((address) => submitSponsorRequestsSequentially(state, address));
  const nestedReceipts = await Promise.all(promises);
  return flatten(nestedReceipts);
}

export function applyFulfillments<T>(requests: Request<T>[], receipts: TransactionReceipt[]) {
  return requests.reduce((acc, request) => {
    const receipt = receipts.find((r) => r.id === request.id);
    // If the request was not submitted or the transaction doesn't have a hash, leave it as is
    if (!receipt || !receipt.data?.hash) {
      return [...acc, request];
    }

    const updatedRequest = {
      ...request,
      fulfillment: { hash: receipt.data.hash },
      status: RequestStatus.Submitted,
    };
    return [...acc, updatedRequest];
  }, [] as Request<T>[]);
}
