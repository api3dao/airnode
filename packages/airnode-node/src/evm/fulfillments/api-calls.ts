import isNil from 'lodash/isNil';
import { ethers } from 'ethers';
import { go } from '../../utils/promise-utils';
import * as logger from '../../logger';
import * as requests from '../../requests';
import { DEFAULT_RETRY_TIMEOUT_MS } from '../../constants';
import { ApiCall, Request, LogsErrorData, RequestErrorMessage, RequestStatus, TransactionOptions } from '../../types';
import { AirnodeRrp } from '../contracts';
import { decodeRevertString } from '..';

const GAS_LIMIT = 500_000;

type StaticResponse = { readonly callSuccess: boolean; readonly callData: string } | null;

type SubmitResponse = ethers.Transaction | null;

interface ApiCallWithSignature extends ApiCall {
  readonly signature: string;
}

async function signResponseMessage(request: Request<ApiCall>, masterHDNode: ethers.utils.HDNode) {
  const airnodeWallet = ethers.Wallet.fromMnemonic(masterHDNode.mnemonic!.phrase);
  return await airnodeWallet.signMessage(
    ethers.utils.arrayify(
      ethers.utils.keccak256(
        ethers.utils.solidityPack(['bytes32', 'bytes'], [request.id, request.responseValue || '0x'])
      )
    )
  );
}

// NOTE:
// This module attempts to fulfill a given API call requests through a series of checks
// made to the EVM provider. The general process looks like this:
//
//   1. Test if fulfillment call would revert
//     a. If it would revert, go to the next step
//     b. If it would succeed, follow through and return
//   2. Fail the API call
//
// Testing if fulfillment would revert is done by executing a static call to the contract.
// Fulfillments respond with a `callSuccess` boolean property that indicates whether
// or not the call would succeed.
//
// We also need to handle when the Ethereum provider fails or returns a bad response. If we
// fail to get a response, then a log entry is created and the error is caught
// and returned. The code then proceeds to the next step in the list of paths above. If the
// provider is not responding at all then all of the error logs are collected and returned.

// =================================================================
// Fulfillments
// =================================================================
async function testFulfill(
  airnodeRrp: AirnodeRrp,
  request: Request<ApiCallWithSignature>,
  options: TransactionOptions
): Promise<LogsErrorData<StaticResponse>> {
  const noticeLog = logger.pend('DEBUG', `Attempting to fulfill API call for Request:${request.id}...`);

  const operation = (): Promise<StaticResponse> =>
    airnodeRrp.callStatic.fulfill(
      request.id,
      request.airnodeAddress,
      request.fulfillAddress,
      request.fulfillFunctionId,
      request.responseValue || '0x',
      request.signature,
      {
        gasLimit: GAS_LIMIT,
        ...options.gasPrice,
        nonce: request.nonce!,
      }
    );
  const [err, res] = await go(operation, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
  if (err) {
    const errorLog = logger.pend('ERROR', `Error attempting API call fulfillment for Request:${request.id}`, err);
    return [[noticeLog, errorLog], err, null];
  }
  return [[noticeLog], null, res];
}

async function submitFulfill(
  airnodeRrp: AirnodeRrp,
  request: Request<ApiCallWithSignature>,
  options: TransactionOptions
): Promise<LogsErrorData<SubmitResponse>> {
  const noticeLog = logger.pend('INFO', `Submitting API call fulfillment for Request:${request.id}...`);

  const tx = (): Promise<ethers.ContractTransaction> =>
    airnodeRrp.fulfill(
      request.id,
      request.airnodeAddress,
      request.fulfillAddress,
      request.fulfillFunctionId,
      request.responseValue || '0x',
      request.signature,
      {
        gasLimit: GAS_LIMIT,
        ...options.gasPrice,
        nonce: request.nonce!,
      }
    );
  const [err, res] = await go(tx, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
  if (err) {
    const errorLog = logger.pend(
      'ERROR',
      `Error submitting API call fulfillment transaction for Request:${request.id}`,
      err
    );
    return [[noticeLog, errorLog], err, null];
  }
  return [[noticeLog], null, res];
}

async function testAndSubmitFulfill(
  airnodeRrp: AirnodeRrp,
  request: Request<ApiCall>,
  options: TransactionOptions
): Promise<LogsErrorData<SubmitResponse>> {
  const errorMessage = requests.getErrorMessage(request);
  if (errorMessage) {
    const [submitLogs, submitErr, submitData] = await submitFail(airnodeRrp, request, errorMessage, options);
    return [submitLogs, submitErr, submitData];
  }

  // Compute signature once.
  // Not computing this beforehand because it might be a very computational expensive operation
  const signature = await signResponseMessage(request, options.masterHDNode);

  // Should not throw
  const [testLogs, testErr, testData] = await testFulfill(airnodeRrp, { ...request, signature }, options);

  if (testErr || (testData && !testData.callSuccess)) {
    const updatedRequest: Request<ApiCall> = {
      ...request,
      status: RequestStatus.Errored,
      errorMessage: testErr
        ? `${RequestErrorMessage.FulfillTransactionFailed} with error: ${testErr.message}`
        : RequestErrorMessage.FulfillTransactionFailed,
    };
    const [submitLogs, submitErr, submitData] = await submitFail(
      airnodeRrp,
      updatedRequest,
      testErr?.message ?? decodeRevertString(testData?.callData || '0x'),
      options
    );
    return [[...testLogs, ...submitLogs], submitErr, submitData];
  }

  // We expect the transaction to be successful if submitted
  if (testData?.callSuccess) {
    const [submitLogs, submitErr, submitData] = await submitFulfill(airnodeRrp, { ...request, signature }, options);

    // The transaction was submitted successfully
    if (submitData) {
      return [[...testLogs, ...submitLogs], null, submitData];
    }
    return [[...testLogs, ...submitLogs], submitErr, null];
  }

  const errorLog = logger.pend(
    'ERROR',
    `Fulfill attempt for Request:${request.id} responded with unexpected value: '${testData}'`
  );

  return [[...testLogs, errorLog], testErr, null];
}

// =================================================================
// Failures
// =================================================================
async function submitFail(
  airnodeRrp: AirnodeRrp,
  request: Request<ApiCall>,
  errorMessage: string,
  options: TransactionOptions
): Promise<LogsErrorData<SubmitResponse>> {
  const noticeLog = logger.pend('INFO', `Submitting API call fail for Request:${request.id}...`);

  const tx = (): Promise<ethers.ContractTransaction> =>
    airnodeRrp.fail(
      request.id,
      request.airnodeAddress,
      request.fulfillAddress,
      request.fulfillFunctionId,
      errorMessage,
      {
        gasLimit: GAS_LIMIT,
        ...options.gasPrice,
        nonce: request.nonce!,
      }
    );

  const [err, res] = await go(tx, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
  if (err) {
    const errorLog = logger.pend('ERROR', `Error submitting API call fail transaction for Request:${request.id}`, err);
    return [[noticeLog, errorLog], err, null];
  }
  return [[noticeLog], null, res];
}

// =================================================================
// Main functions
// =================================================================
export async function submitApiCall(
  airnodeRrp: AirnodeRrp,
  request: Request<ApiCall>,
  options: TransactionOptions
): Promise<LogsErrorData<SubmitResponse>> {
  if (request.status !== RequestStatus.Pending && request.status !== RequestStatus.Errored) {
    const logStatus = request.status === RequestStatus.Fulfilled ? 'DEBUG' : 'INFO';
    const log = logger.pend(
      logStatus,
      `API call for Request:${request.id} not actioned as it has status:${request.status}`
    );
    return [[log], null, null];
  }

  if (isNil(request.nonce)) {
    const log = logger.pend(
      'ERROR',
      `API call for Request:${request.id} cannot be submitted as it does not have a nonce`
    );
    return [[log], null, null];
  }

  // Should not throw
  const [submitLogs, submitErr, submitData] = await testAndSubmitFulfill(airnodeRrp, request, options);
  return [submitLogs, submitErr, submitData];
}
