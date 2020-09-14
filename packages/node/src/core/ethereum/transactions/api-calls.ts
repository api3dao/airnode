import { ethers } from 'ethers';
import { go } from '../../utils/promise-utils';
import * as logger from '../../utils/logger';
import {
  ApiCall,
  ClientRequest,
  LogsWithData,
  RequestErrorCode,
  RequestStatus,
  TransactionOptions,
} from '../../../types';

const GAS_LIMIT = 500_000;

// NOTE:
// This module definitely appears convoluted, but unfortunately there are quite a few different
// paths that are possible before a transaction is submitted. Before initiating a transaction,
// we check that it won't revert. If it will revert, then we fall through to the next function
// These are the main code paths:
//
// A: The call to the API was successful
//   - Test the fulfill function (follow through if successful)
//   - Test the error function (follow through if successful)
//   - Fail
//
// B: The call to the API was unsuccessful
//   - Test the error function (follow through if successful)
//   - Fail
//
// Testing fulfill/error responds with `callSuccess` which indicates whether or not
// the transaction would revert.
//
// We also need to handle when the Ethereum provider. If we fail to get a response,
// then a log entry is created (although not posted to console) and the error is caught
// and returned. The code then proceeds to the next step in the list of paths. If the
// provider is not responding at all then all of the error logs are collected and returned.

// =================================================================
// Errors
// =================================================================
async function testError(
  airnode: ethers.Contract,
  request: ClientRequest<ApiCall>,
  options: TransactionOptions
): Promise<LogsWithData> {
  const noticeLog = logger.pend('DEBUG', `Attempting to error API call for Request:${request.id}...`);

  const attemptedTx = airnode.callStatic.error(
    request.id,
    request.errorCode,
    request.errorAddress,
    request.errorFunctionId,
    {
      gasLimit: GAS_LIMIT,
      gasPrice: options.gasPrice,
      nonce: request.nonce!,
    }
  );

  const [err, res] = await go(attemptedTx);
  if (err) {
    const errorLog = logger.pend('ERROR', `Error attempting API call error for Request:${request.id}. ${err}`);
    return [[noticeLog, errorLog], err, null];
  }
  return [[noticeLog], null, res];
}

async function submitError(
  airnode: ethers.Contract,
  request: ClientRequest<ApiCall>,
  options: TransactionOptions
): Promise<LogsWithData> {
  const noticeLog = logger.pend('INFO', `Submitting API call error for Request:${request.id}...`);

  const tx = airnode.error(request.id, request.errorCode, request.errorAddress, request.errorFunctionId, {
    gasLimit: GAS_LIMIT,
    gasPrice: options.gasPrice,
    nonce: request.nonce!,
  });

  const [err, res] = await go(tx);
  if (err) {
    const errorLog = logger.pend(
      'ERROR',
      `Error submitting API call error transaction for Request:${request.id}. ${err}`
    );
    return [[noticeLog, errorLog], err, null];
  }
  return [[noticeLog], null, res];
}

async function testAndSubmitError(
  airnode: ethers.Contract,
  request: ClientRequest<ApiCall>,
  options: TransactionOptions
): Promise<LogsWithData> {
  // Should not throw
  const [testLogs, testErr, testData] = await testError(airnode, request, options);

  if (testErr || (testData && !testData.callSuccess)) {
    const [submitLogs, submitErr, submitData] = await submitFail(airnode, request, options);
    return [[...testLogs, ...submitLogs], submitErr, submitData];
  }

  // We expect the transaction to be successful if submitted
  if (testData?.callSuccess) {
    const [submitLogs, submitErr, submitData] = await submitError(airnode, request, options);

    // The transaction was submitted successfully
    if (submitData) {
      return [[...testLogs, ...submitLogs], null, submitData];
    }
    return [[...testLogs, ...submitLogs], submitErr, null];
  }

  const errorLog = logger.pend(
    'ERROR',
    `Error attempt for Request:${request.id} responded with unexpected value: '${testData}'`
  );

  return [[...testLogs, errorLog], testErr, null];
}

// =================================================================
// Fulfillments
// =================================================================
async function testFulfill(
  airnode: ethers.Contract,
  request: ClientRequest<ApiCall>,
  options: TransactionOptions
): Promise<LogsWithData> {
  const noticeLog = logger.pend('DEBUG', `Attempting to fulfill API call for Request:${request.id}...`);

  const attemptedTx = airnode.callStatic.fulfill(
    request.id,
    request.response!.value,
    request.fulfillAddress,
    request.fulfillFunctionId,
    {
      gasLimit: GAS_LIMIT,
      gasPrice: options.gasPrice,
      nonce: request.nonce!,
    }
  );

  const [err, res] = await go(attemptedTx);
  if (err) {
    const errorLog = logger.pend('ERROR', `Error attempting API call fulfillment for Request:${request.id}. ${err}`);
    return [[noticeLog, errorLog], err, null];
  }
  return [[noticeLog], null, res];
}

async function submitFulfill(
  airnode: ethers.Contract,
  request: ClientRequest<ApiCall>,
  options: TransactionOptions
): Promise<LogsWithData> {
  const noticeLog = logger.pend('INFO', `Submitting API call fulfillment for Request:${request.id}...`);

  const tx = airnode.fulfill(request.id, request.response!.value, request.fulfillAddress, request.fulfillFunctionId, {
    gasLimit: GAS_LIMIT,
    gasPrice: options.gasPrice,
    nonce: request.nonce!,
  });

  const [err, res] = await go(tx);
  if (err) {
    const errorLog = logger.pend(
      'ERROR',
      `Error submitting API call fulfillment transaction for Request:${request.id}. ${err}`
    );
    return [[noticeLog, errorLog], err, null];
  }
  return [[noticeLog], null, res];
}

async function testAndSubmitFulfill(
  airnode: ethers.Contract,
  request: ClientRequest<ApiCall>,
  options: TransactionOptions
): Promise<LogsWithData> {
  // Should not throw
  const [testLogs, testErr, testData] = await testFulfill(airnode, request, options);

  if (testErr || (testData && !testData.callSuccess)) {
    const updatedRequest = {
      ...request,
      status: RequestStatus.Errored,
      errorCode: RequestErrorCode.FulfillTransactionFailed,
    };
    const [submitLogs, submitErr, submitData] = await testAndSubmitError(airnode, updatedRequest, options);
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
): Promise<LogsWithData> {
  const noticeLog = logger.pend('INFO', `Submitting API call fail for Request:${request.id}...`);

  const tx = airnode.fail(request.id, { gasLimit: GAS_LIMIT, gasPrice: options.gasPrice, nonce: request.nonce! });

  const [err, res] = await go(tx);
  if (err) {
    const errorLog = logger.pend(
      'ERROR',
      `Error submitting API call fail transaction for Request:${request.id}. ${err}`
    );
    return [[noticeLog, errorLog], err, null];
  }
  return [[noticeLog], null, res];
}

// =================================================================
// Main functions
// =================================================================
export async function submitApiCall(
  airnode: ethers.Contract,
  request: ClientRequest<ApiCall>,
  options: TransactionOptions
): Promise<LogsWithData> {
  // No need to log anything if the request is already fulfilled
  if (request.status === RequestStatus.Fulfilled) {
    return [[], null, null];
  }

  if (request.status === RequestStatus.Errored) {
    // Should not throw
    const [submitLogs, submitErr, submitData] = await testAndSubmitError(airnode, request, options);
    return [submitLogs, submitErr, submitData];
  }

  if (request.status === RequestStatus.Pending) {
    // Should not throw
    const [submitLogs, submitErr, submitData] = await testAndSubmitFulfill(airnode, request, options);
    return [submitLogs, submitErr, submitData];
  }

  const noticeLog = logger.pend(
    'INFO',
    `API call for Request:${request.id} not actioned as it has status:${request.status}`
  );

  return [[noticeLog], null, null];
}
