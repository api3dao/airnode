import isNil from 'lodash/isNil';
import { ethers } from 'ethers';
import { applyTransactionResult } from './requests';
import { go } from '../../utils/promise-utils';
import * as logger from '../../logger';
import * as requests from '../../requests';
import { DEFAULT_RETRY_TIMEOUT_MS, MAXIMUM_ONCHAIN_ERROR_LENGTH } from '../../constants';
import {
  ApiCall,
  Request,
  LogsErrorData,
  RequestErrorMessage,
  RequestStatus,
  TransactionOptions,
  SubmitRequest,
} from '../../types';
import { AirnodeRrp } from '../contracts';
import { decodeRevertString } from '../utils';

const GAS_LIMIT = 500_000;

type StaticResponse = { readonly callSuccess: boolean; readonly callData: string } | null;

// TODO: Improve TS types so that it's clear that request object in
// `testFulfill` and `submitFulfill` contains `responseValue` and `signature` fields

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
  request: Request<ApiCall>,
  options: TransactionOptions
): Promise<LogsErrorData<StaticResponse>> {
  const noticeLog = logger.pend('DEBUG', `Attempting to fulfill API call for Request:${request.id}...`);

  const operation = (): Promise<StaticResponse> =>
    airnodeRrp.callStatic.fulfill(
      request.id,
      request.airnodeAddress,
      request.fulfillAddress,
      request.fulfillFunctionId,
      request.responseValue!,
      request.signature!,
      {
        gasLimit: GAS_LIMIT,
        ...options.gasTarget,
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
  request: Request<ApiCall>,
  options: TransactionOptions
): Promise<LogsErrorData<Request<ApiCall>>> {
  const noticeLog = logger.pend('INFO', `Submitting API call fulfillment for Request:${request.id}...`);

  const tx = (): Promise<ethers.ContractTransaction> =>
    airnodeRrp.fulfill(
      request.id,
      request.airnodeAddress,
      request.fulfillAddress,
      request.fulfillFunctionId,
      request.responseValue!,
      request.signature!,
      {
        gasLimit: GAS_LIMIT,
        ...options.gasTarget,
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
  return [[noticeLog], null, applyTransactionResult(request, res)];
}

async function testAndSubmitFulfill(
  airnodeRrp: AirnodeRrp,
  request: Request<ApiCall>,
  options: TransactionOptions
): Promise<LogsErrorData<Request<ApiCall>>> {
  const errorMessage = requests.getErrorMessage(request);
  if (errorMessage) {
    return await submitFail(airnodeRrp, request, errorMessage, options);
  }

  // Should not throw
  const [testLogs, testErr, testData] = await testFulfill(airnodeRrp, request, options);

  if (testErr || (testData && !testData.callSuccess)) {
    const updatedRequest: Request<ApiCall> = {
      ...request,
      status: RequestStatus.Errored,
      errorMessage: testErr
        ? `${RequestErrorMessage.FulfillTransactionFailed} with error: ${testErr.message}`
        : RequestErrorMessage.FulfillTransactionFailed,
    };
    const [submitLogs, submitErr, submittedRequest] = await submitFail(
      airnodeRrp,
      updatedRequest,
      testErr?.message ?? decodeRevertString(testData?.callData || '0x'),
      options
    );
    return [[...testLogs, ...submitLogs], submitErr, submittedRequest];
  }

  // We expect the transaction to be successful if submitted
  if (testData?.callSuccess) {
    const [submitLogs, submitErr, submitData] = await submitFulfill(airnodeRrp, request, options);
    return [[...testLogs, ...submitLogs], submitErr, submitData];
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
): Promise<LogsErrorData<Request<ApiCall>>> {
  const noticeLog = logger.pend('INFO', `Submitting API call fail for Request:${request.id}...`);
  const trimmedErrorMessage =
    errorMessage.length > MAXIMUM_ONCHAIN_ERROR_LENGTH
      ? errorMessage.substring(0, MAXIMUM_ONCHAIN_ERROR_LENGTH - 3).concat('...')
      : errorMessage;

  const tx = (): Promise<ethers.ContractTransaction> =>
    airnodeRrp.fail(
      request.id,
      request.airnodeAddress,
      request.fulfillAddress,
      request.fulfillFunctionId,
      trimmedErrorMessage,
      {
        gasLimit: GAS_LIMIT,
        ...options.gasTarget,
        nonce: request.nonce!,
      }
    );

  const [err, res] = await go(tx, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
  if (err) {
    const errorLog = logger.pend('ERROR', `Error submitting API call fail transaction for Request:${request.id}`, err);
    return [[noticeLog, errorLog], err, null];
  }
  return [[noticeLog], null, applyTransactionResult(request, res)];
}

// =================================================================
// Main functions
// =================================================================
export const submitApiCall: SubmitRequest<ApiCall> = async (airnodeRrp, request, options) => {
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
  return testAndSubmitFulfill(airnodeRrp, request, options);
};
