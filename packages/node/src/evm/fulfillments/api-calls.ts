import { ethers } from 'ethers';
import { go, retryOperation } from '../../utils/promise-utils';
import * as logger from '../../logger';
import * as requests from '../../requests';
import {
  ApiCall,
  ClientRequest,
  LogsErrorData,
  RequestErrorCode,
  RequestStatus,
  TransactionOptions,
} from '../../types';
import { OPERATION_RETRIES } from '../../constants';

const GAS_LIMIT = 500_000;

type StaticResponse = { callSuccess: boolean } | null;

type SubmitResponse = ethers.Transaction | null;

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
  airnode: ethers.Contract,
  request: ClientRequest<ApiCall>,
  options: TransactionOptions
): Promise<LogsErrorData<StaticResponse>> {
  const statusCode = ethers.BigNumber.from(requests.getErrorCode(request));

  const noticeLog = logger.pend(
    'DEBUG',
    `Attempting to fulfill API call with status code:${statusCode.toString()} for Request:${request.id}...`
  );

  const operation = () =>
    airnode.callStatic.fulfill(
      request.id,
      request.providerId,
      statusCode,
      request.responseValue || ethers.constants.HashZero,
      request.fulfillAddress,
      request.fulfillFunctionId,
      {
        gasLimit: GAS_LIMIT,
        gasPrice: options.gasPrice,
        nonce: request.nonce!,
      }
    );
  const retryableOperation = retryOperation(OPERATION_RETRIES, operation);
  const [err, res] = await go(retryableOperation);
  if (err) {
    const errorLog = logger.pend('ERROR', `Error attempting API call fulfillment for Request:${request.id}`, err);
    return [[noticeLog, errorLog], err, null];
  }
  return [[noticeLog], null, res];
}

async function submitFulfill(
  airnode: ethers.Contract,
  request: ClientRequest<ApiCall>,
  options: TransactionOptions
): Promise<LogsErrorData<SubmitResponse>> {
  const statusCode = ethers.BigNumber.from(requests.getErrorCode(request));

  const noticeLog = logger.pend(
    'INFO',
    `Submitting API call fulfillment with status code:${statusCode.toString()} for Request:${request.id}...`
  );

  const tx = () =>
    airnode.fulfill(
      request.id,
      request.providerId,
      statusCode,
      request.responseValue || ethers.constants.HashZero,
      request.fulfillAddress,
      request.fulfillFunctionId,
      {
        gasLimit: GAS_LIMIT,
        gasPrice: options.gasPrice,
        nonce: request.nonce!,
      }
    );
  const retryableTx = retryOperation(OPERATION_RETRIES, tx);
  const [err, res] = await go(retryableTx);
  if (err) {
    const errorLog = logger.pend(
      'ERROR',
      `Error submitting API call fulfillment transaction for Request:${request.id}`,
      err
    );
    return [[noticeLog, errorLog], err, null];
  }
  return [[noticeLog], null, res as ethers.Transaction];
}

async function testAndSubmitFulfill(
  airnode: ethers.Contract,
  request: ClientRequest<ApiCall>,
  options: TransactionOptions
): Promise<LogsErrorData<SubmitResponse>> {
  // Should not throw
  const [testLogs, testErr, testData] = await testFulfill(airnode, request, options);

  if (testErr || (testData && !testData.callSuccess)) {
    const updatedRequest = {
      ...request,
      status: RequestStatus.Errored,
      errorCode: RequestErrorCode.FulfillTransactionFailed,
    };
    const [submitLogs, submitErr, submitData] = await submitFail(airnode, updatedRequest, options);
    return [[...testLogs, ...submitLogs], submitErr, submitData];
  }

  // We expect the transaction to be successful if submitted
  if (testData?.callSuccess) {
    const [submitLogs, submitErr, submitData] = await submitFulfill(airnode, request, options);

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
  airnode: ethers.Contract,
  request: ClientRequest<ApiCall>,
  options: TransactionOptions
): Promise<LogsErrorData<SubmitResponse>> {
  const noticeLog = logger.pend('INFO', `Submitting API call fail for Request:${request.id}...`);

  const tx = () =>
    airnode.fail(request.id, request.providerId, request.fulfillAddress, request.fulfillFunctionId, {
      gasLimit: GAS_LIMIT,
      gasPrice: options.gasPrice,
      nonce: request.nonce!,
    });
  const retryableTx = retryOperation(OPERATION_RETRIES, tx);
  const [err, res] = await go(retryableTx);
  if (err) {
    const errorLog = logger.pend('ERROR', `Error submitting API call fail transaction for Request:${request.id}`, err);
    return [[noticeLog, errorLog], err, null];
  }
  return [[noticeLog], null, res as ethers.Transaction];
}

// =================================================================
// Main functions
// =================================================================
export async function submitApiCall(
  airnode: ethers.Contract,
  request: ClientRequest<ApiCall>,
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

  if (!request.nonce) {
    const log = logger.pend(
      'ERROR',
      `API call for Request:${request.id} cannot be submitted as it does not have a nonce`
    );
    return [[log], null, null];
  }

  // Should not throw
  const [submitLogs, submitErr, submitData] = await testAndSubmitFulfill(airnode, request, options);
  return [submitLogs, submitErr, submitData];
}
