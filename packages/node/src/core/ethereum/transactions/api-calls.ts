import { ethers } from 'ethers';
import { go } from 'src/core/utils/promise-utils';
import * as logger from 'src/core/utils/logger';
import {
  ApiCall,
  ClientRequest,
  LogsWithData,
  RequestStatus,
  TransactionOptions,
} from 'src/types';

const GAS_LIMIT = 500000;

async function testFulfill(airnode: ethers.Contract, request: ClientRequest<ApiCall>, options: TransactionOptions): Promise<LogsWithData> {
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
  // TODO:
  console.log('FULFILL ATTEMPT RESULT: ', res);
  if (err) {
    const errorLog = logger.pend('ERROR', `Error attempting API call fulfillment for Request:${request.id}. ${err}`);
    return { logs: [...options.logs, noticeLog, errorLog], error: err };
  }
  return { logs: [...options.logs, noticeLog], data: res };
}

async function testError(airnode: ethers.Contract, request: ClientRequest<ApiCall>, options: TransactionOptions): Promise<LogsWithData> {
  const noticeLog = logger.pend('DEBUG', `Attempting to error API call for Request:${request.id}...`);

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
    const errorLog = logger.pend('ERROR', `Error attempting API call error for Request:${request.id}. ${err}`);
    return { logs: [...options.logs, noticeLog, errorLog], error: err };
  }
  return { logs: [...options.logs, noticeLog], data: res };
}

async function submitFulfill(airnode: ethers.Contract, request: ClientRequest<ApiCall>, options: TransactionOptions): Promise<LogsWithData> {
  const noticeLog = logger.pend('INFO', `Fulfilling API call for Request:${request.id}...`);

  const tx = airnode.fulfill(
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

  const [err, res] = await go(tx);
  if (err) {
    const errorLog = logger.pend('ERROR', `Error submitting API call fulfillment transaction for Request:${request.id}. ${err}`);
    return { logs: [...options.logs, noticeLog, errorLog], error: err };
  }
  return { logs: [...options.logs, noticeLog], data: res };
}

async function submitError(airnode: ethers.Contract, request: ClientRequest<ApiCall>, options: TransactionOptions): Promise<LogsWithData> {
  const noticeLog = logger.pend('INFO', `Erroring API call for Request:${request.id}...`);

  const tx = airnode.error(request.id, request.errorCode, request.errorAddress, request.errorFunctionId, {
    gasLimit: GAS_LIMIT,
    gasPrice: options.gasPrice,
    nonce: request.nonce!,
  });

  const [err, res] = await go(tx);
  if (err) {
    const errorLog = logger.pend('ERROR', `Error submitting API call error transaction for Request:${request.id}. ${err}`);
    return { logs: [...options.logs, noticeLog, errorLog], error: err };
  }
  return { logs: [...options.logs, noticeLog], data: res };
}

async function testAndSubmitFulfill(airnode: ethers.Contract, request: ClientRequest<ApiCall>, options: TransactionOptions): Promise<LogsWithData> {
  // Should not throw
  const attempt = await testFulfill(airnode, request, options);

  // The transaction should be successful when submitted
  if (attempt.data?.callSuccess) {
    const logs = [...options.logs, ...attempt.logs];
    const execution = await submitFulfill(airnode, request, { ...options, logs });

    // The transaction was submitted successfully
    if (execution.data) {
      return { logs: [...options.logs, ...execution.logs], data: execution.data };
    }
    return { logs: [...options.logs, ...execution.logs], error: execution.error };
  }

  if (attempt.error || !attempt.data?.callSuccess) {
    const logs = [...options.logs, ...attempt.logs];
    return testAndSubmitError(airnode, request, { ...options, logs });
  }

  return { logs: [...options.logs, ...attempt.logs], error: attempt.error };
}

async function testAndSubmitError(airnode: ethers.Contract, request: ClientRequest<ApiCall>, options: TransactionOptions): Promise<LogsWithData> {
  // Should not throw
  const attempt = await testError(airnode, request, options);

  // The transaction should be successful when submitted
  if (attempt.data?.callSuccess) {
    const logs = [...options.logs, ...attempt.logs];
    const execution = await submitError(airnode, request, { ...options, logs });

    // The transaction was submitted successfully
    if (execution.data) {
      return { logs: [...options.logs, ...execution.logs], data: execution.data };
    }
    return { logs: [...options.logs, ...execution.logs], error: execution.error };
  }

  if (attempt.error || !attempt.data?.callSuccess) {
    const logs = [...options.logs, ...attempt.logs];
    return fail(airnode, request, { ...options, logs });
  }

  return { logs: [...options.logs, ...attempt.logs], error: attempt.error };
}

async function fail(airnode: ethers.Contract, request: ClientRequest<ApiCall>, options: TransactionOptions): Promise<LogsWithData> {
  const noticeLog = logger.pend('INFO', `Failing API call for Request:${request.id}`);

  const tx = airnode.fail(request.id, { gasLimit: GAS_LIMIT, gasPrice: options.gasPrice, nonce: request.nonce! });

  const [err, res] = await go(tx);
  if (err) {
    const errorLog = logger.pend('ERROR', `Error submitting API call fail transaction for Request:${request.id}. ${err}`);
    return { logs: [...options.logs, noticeLog, errorLog], error: err };
  }
  return { logs: [...options.logs, noticeLog], data: res };
}

export async function submitApiCall(airnode: ethers.Contract, request: ClientRequest<ApiCall>, options: TransactionOptions): Promise<LogsWithData> {
  // No need to log anything if the request is already fulfilled
  if (request.status === RequestStatus.Fulfilled) {
    return { logs: options.logs, data: null };
  }

  if (request.status === RequestStatus.Errored) {
    // Should not throw
    const res = await testAndSubmitError(airnode, request, options);
    return { logs: res.logs, data: res.data };
  }

  if (request.status === RequestStatus.Pending) {
    // Should not throw
    const res = await testAndSubmitFulfill(airnode, request, options);
    return { logs: res.logs, data: res.data };
  }

  const log = logger.pend('INFO', `API call for Request:${request.id} not actioned as it has status:${request.status}`);

  return { logs: [...options.logs, log], data: null };
}
