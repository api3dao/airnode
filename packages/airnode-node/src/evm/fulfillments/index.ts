import { submitApiCall } from './api-calls';
import { submitWithdrawal } from './withdrawals';
import * as grouping from '../../requests/grouping';
import * as logger from '../../logger';
import * as wallet from '../wallet';
import {
  Request,
  EVMProviderState,
  ProviderState,
  RequestType,
  TransactionOptions,
  LogsErrorData,
  GroupedRequests,
  ApiCall,
  Withdrawal,
} from '../../types';
import { AirnodeRrpFactory, AirnodeRrp } from '../contracts';
import * as verification from '../verification';

interface OrderedRequest<T> {
  readonly nonce: number;
  type: RequestType;
  readonly makeRequest: () => Promise<Request<T>>;
}

function baseLogOptions(state: ProviderState<EVMProviderState>) {
  const { chainId, chainType, name: providerName } = state.settings;
  const { coordinatorId } = state;

  return {
    format: state.settings.logFormat,
    level: state.settings.logLevel,
    meta: { coordinatorId, providerName, chainType, chainId },
  };
}

function transactionOptions(state: ProviderState<EVMProviderState>) {
  return {
    gasTarget: state.gasTarget!,
    masterHDNode: state.masterHDNode,
    provider: state.provider,
  };
}

function submitRequests<T>(
  state: ProviderState<EVMProviderState>,
  requests: Request<T>[],
  type: RequestType,
  submitFunction: (
    airnodeRrp: AirnodeRrp,
    request: Request<T>,
    options: TransactionOptions
  ) => Promise<LogsErrorData<Request<T>>>,
  contract: AirnodeRrp
): OrderedRequest<T>[] {
  return requests.map((request) => {
    const makeRequest = async () => {
      // NOTE: This err was not actually handled anywhere before, what should we do with it?
      const [logs, _err, submittedRequest] = await submitFunction(contract, request, transactionOptions(state));
      logger.logPending(logs, baseLogOptions(state));

      return submittedRequest || request;
    };

    return {
      nonce: request.nonce!,
      type,
      makeRequest,
    };
  });
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
async function submitSponsorRequestsSequentially(
  state: ProviderState<EVMProviderState>,
  sponsorAddress: string
): Promise<GroupedRequests> {
  const { AirnodeRrp } = state.contracts;
  const requestsBySponsorAddress = grouping.groupRequestsBySponsorAddress(state.requests);
  const requests = requestsBySponsorAddress[sponsorAddress];
  const sponsorWallet = wallet.deriveSponsorWallet(state.masterHDNode, sponsorAddress);
  const signer = sponsorWallet.connect(state.provider);
  const contract = AirnodeRrpFactory.connect(AirnodeRrp, signer);

  // Submit transactions for API calls
  const submittedApiCalls = submitRequests(state, requests.apiCalls, RequestType.ApiCall, submitApiCall, contract);

  // Verify sponsor wallets for withdrawals
  const [verifyWithdrawalLogs, verifiedWithdrawals] = verification.verifySponsorWallets(
    requests.withdrawals,
    state.masterHDNode
  );
  logger.logPending(verifyWithdrawalLogs, baseLogOptions(state));

  // Submit transactions for withdrawals
  const submittedWithdrawals = submitRequests(
    state,
    verifiedWithdrawals,
    RequestType.Withdrawal,
    submitWithdrawal,
    contract
  );

  const allRequests = [...submittedApiCalls, ...submittedWithdrawals];
  // Sort by the nonce value increasingly
  allRequests.sort((a, b) => a.nonce - b.nonce);

  const apiCalls: Request<ApiCall>[] = [];
  const withdrawals: Request<Withdrawal>[] = [];
  // Perform the requests sequentially to in order to respect the nonce value
  for (const request of allRequests) {
    const submittedRequest = await request.makeRequest();
    if (submittedRequest.fulfillment?.hash) {
      logger.info(
        `Transaction:${submittedRequest.fulfillment.hash} submitted for Request:${submittedRequest.id}`,
        baseLogOptions(state)
      );
    }

    // TODO: Include RequestType in the actual Request object
    if (request.type === RequestType.ApiCall) {
      apiCalls.push(submittedRequest as Request<ApiCall>);
    }
    if (request.type === RequestType.Withdrawal) {
      withdrawals.push(submittedRequest as Request<Withdrawal>);
    }
  }

  return {
    apiCalls,
    withdrawals,
  };
}

export async function submit(state: ProviderState<EVMProviderState>) {
  const requestsBySponsorAddress = grouping.groupRequestsBySponsorAddress(state.requests);
  const sponsorAddresses = Object.keys(requestsBySponsorAddress);

  const promises = sponsorAddresses.map((address) => submitSponsorRequestsSequentially(state, address));
  const nestedGroupRequests = await Promise.all(promises);
  return nestedGroupRequests.reduce((merged, groupRequests) => ({
    apiCalls: [...merged.apiCalls, ...groupRequests.apiCalls],
    withdrawals: [...merged.withdrawals, ...groupRequests.withdrawals],
  }));
}
