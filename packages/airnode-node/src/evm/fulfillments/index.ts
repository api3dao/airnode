import { LegacyTypeLiteral, logger } from '@api3/airnode-utilities';
import { BigNumber } from 'ethers';
import { submitApiCall } from './api-calls';
import { submitWithdrawal } from './withdrawals';
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
  ApiCallWithResponse,
} from '../../types';
import { AirnodeRrpV0Factory, AirnodeRrpV0 } from '../contracts';
import * as verification from '../verification';

interface OrderedRequest<T> {
  request: Request<T>;
  type: RequestType;
  makeRequest: () => Promise<Request<T> | Error>;
}

function getTransactionOptions<T>(
  state: ProviderState<EVMProviderSponsorState>,
  request: Request<T>,
  type: RequestType
) {
  let gasTarget = state.gasTarget!;

  // Overwrite gasTarget with a legacy type if an override for gas price has been set
  // via the presence of a _gasPrice reserved parameter
  if (type === RequestType.ApiCall) {
    // Cast request based on confirmed type to access property
    const apiCall = request as any as Request<ApiCallWithResponse>;

    if (apiCall.reservedParameterOverrides && apiCall.reservedParameterOverrides.gasPrice) {
      const gasPrice = apiCall.reservedParameterOverrides.gasPrice;
      gasTarget = {
        type: 0 as LegacyTypeLiteral,
        gasLimit: state.gasTarget!.gasLimit,
        gasPrice: BigNumber.from(gasPrice),
      };
      logger.info(`Gas price overridden with reserved parameter value ${gasPrice} wei for Request ID:${apiCall.id}`);
    }
  }

  return {
    gasTarget: gasTarget,
    contracts: state.contracts,
    masterHDNode: state.masterHDNode,
    provider: state.provider,
    withdrawalRemainder: state.settings.chainOptions.withdrawalRemainder,
  };
}

function prepareRequestSubmissions<T>(
  state: ProviderState<EVMProviderSponsorState>,
  requests: Request<T>[],
  type: RequestType,
  submitFunction: SubmitRequest<T>,
  contract: AirnodeRrpV0
): OrderedRequest<T>[] {
  return requests.map((request) => {
    const makeRequest = async () => {
      const [logs, err, submittedRequest] = await submitFunction(
        contract,
        request,
        getTransactionOptions(state, request, type)
      );
      logger.logPending(logs);

      if (err) return err;
      return submittedRequest || request;
    };

    return {
      request: request,
      type,
      makeRequest,
    };
  });
}

/**
 * Sponsor requests are performed from the sponsor wallet. Each transaction has a fixed nonce and blockchain rejects out
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
  const contract = AirnodeRrpV0Factory.connect(AirnodeRrp, signer);

  // Prepare transactions for API calls
  const preparedApiCallSubmissions = prepareRequestSubmissions(
    state,
    // The "apiCalls" must be "ApiCallWithResponse" at this point.
    requests.apiCalls as Request<ApiCallWithResponse>[],
    RequestType.ApiCall,
    submitApiCall,
    contract
  );

  // Verify sponsor wallets for withdrawals
  const [verifyWithdrawalLogs, verifiedWithdrawals] = verification.verifySponsorWallets(
    requests.withdrawals,
    state.masterHDNode
  );
  logger.logPending(verifyWithdrawalLogs);

  // Prepare transactions for withdrawals
  const preparedWithdrawalSubmissions = prepareRequestSubmissions(
    state,
    verifiedWithdrawals,
    RequestType.Withdrawal,
    submitWithdrawal,
    contract
  );

  const allRequestSubmissions = [...preparedApiCallSubmissions, ...preparedWithdrawalSubmissions];
  // Sort by the nonce value increasingly
  allRequestSubmissions.sort((a, b) => a.request.nonce! - b.request.nonce!);

  const apiCalls: Request<ApiCall>[] = [];
  const withdrawals: Request<Withdrawal>[] = [];
  const saveRequest = (type: RequestType, request: Request<Withdrawal | ApiCall>) => {
    if (type === RequestType.ApiCall) {
      apiCalls.push(request as Request<ApiCall>);
    }
    if (type === RequestType.Withdrawal) {
      withdrawals.push(request as Request<Withdrawal>);
    }
  };

  // If one of the requests fail other request are bound to fail as well because of the wrong nonce
  let previousTransactionFailed = false;

  // Perform the requests sequentially to in order to respect the nonce value
  for (const requestSubmission of allRequestSubmissions) {
    if (previousTransactionFailed) {
      logger.info(`Request:${requestSubmission.request.id} skipped because one of the previous requests failed`);

      saveRequest(requestSubmission.type, requestSubmission.request);
      continue;
    }

    const submittedRequest = await requestSubmission.makeRequest();

    if (submittedRequest instanceof Error) {
      // Not printing an error, because it is already logged by the "makeRequest" function
      previousTransactionFailed = true;
      saveRequest(requestSubmission.type, requestSubmission.request);
      continue;
    }

    if (submittedRequest.fulfillment?.hash) {
      logger.info(`Transaction:${submittedRequest.fulfillment.hash} submitted for Request:${submittedRequest.id}`);
    }

    saveRequest(requestSubmission.type, submittedRequest);
  }

  return {
    apiCalls,
    withdrawals,
  };
}
