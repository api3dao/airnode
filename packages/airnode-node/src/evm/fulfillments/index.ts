import { submitApiCall } from './api-calls';
import { submitWithdrawal } from './withdrawals';
import * as logger from '../../logger';
import * as wallet from '../wallet';
import {
  Request,
  EVMProviderSponsorState,
  ProviderState,
  RequestType,
  GroupedRequests,
  ApiCall,
  Withdrawal,
  SubmitRequest,
} from '../../types';
import { AirnodeRrpFactory, AirnodeRrp } from '../contracts';
import * as verification from '../verification';

interface OrderedRequest<T> {
  readonly nonce: number;
  type: RequestType;
  readonly makeRequest: () => Promise<Request<T>>;
}

function getBaseLogOptions(state: ProviderState<EVMProviderSponsorState>) {
  const { chainId, chainType, name: providerName } = state.settings;
  const { coordinatorId } = state;

  return {
    format: state.settings.logFormat,
    level: state.settings.logLevel,
    meta: { coordinatorId, providerName, chainType, chainId },
  };
}

function getTransactionOptions(state: ProviderState<EVMProviderSponsorState>) {
  return {
    gasTarget: state.gasTarget!,
    masterHDNode: state.masterHDNode,
    provider: state.provider,
  };
}

function prepareRequestSubmissions<T>(
  state: ProviderState<EVMProviderSponsorState>,
  requests: Request<T>[],
  type: RequestType,
  submitFunction: SubmitRequest<T>,
  contract: AirnodeRrp
): OrderedRequest<T>[] {
  return requests.map((request) => {
    const makeRequest = async () => {
      // NOTE: This err was not actually handled anywhere before, what should we do with it?
      const [logs, _err, submittedRequest] = await submitFunction(contract, request, getTransactionOptions(state));
      logger.logPending(logs, getBaseLogOptions(state));

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
 * This function performs the requests of a particular sponsor sequentially, ordered by transaction nonce increasingly.
 *
 * There is a concept of batched requests, but that doesn't work with transactions. See:
 * https://github.com/ethers-io/ethers.js/issues/892#issuecomment-828897859
 */
export async function submit(state: ProviderState<EVMProviderSponsorState>): Promise<GroupedRequests> {
  const { AirnodeRrp } = state.contracts;
  const { requests } = state;
  const sponsorWallet = wallet.deriveSponsorWallet(state.masterHDNode, state.sponsorAddress);
  const signer = sponsorWallet.connect(state.provider);
  const contract = AirnodeRrpFactory.connect(AirnodeRrp, signer);

  // Prepare transactions for API calls
  const preparedApiCallSubmissions = prepareRequestSubmissions(
    state,
    requests.apiCalls,
    RequestType.ApiCall,
    submitApiCall,
    contract
  );

  // Verify sponsor wallets for withdrawals
  const [verifyWithdrawalLogs, verifiedWithdrawals] = verification.verifySponsorWallets(
    requests.withdrawals,
    state.masterHDNode
  );
  logger.logPending(verifyWithdrawalLogs, getBaseLogOptions(state));

  // Prepare transactions for withdrawals
  const preparedWithdrawalSubmissions = prepareRequestSubmissions(
    state,
    verifiedWithdrawals,
    RequestType.Withdrawal,
    submitWithdrawal,
    contract
  );

  const allRequests = [...preparedApiCallSubmissions, ...preparedWithdrawalSubmissions];
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
        getBaseLogOptions(state)
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
