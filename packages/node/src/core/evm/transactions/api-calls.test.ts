const errorMock = jest.fn();
const failMock = jest.fn();
const fulfillMock = jest.fn();
const staticFulfillMock = jest.fn();
const staticErrorMock = jest.fn();
jest.mock('ethers', () => ({
  ethers: {
    ...jest.requireActual('ethers'),
    Contract: jest.fn().mockImplementation(() => ({
      callStatic: {
        error: staticErrorMock,
        fulfill: staticFulfillMock,
      },
      error: errorMock,
      fail: failMock,
      fulfill: fulfillMock,
    })),
  },
}));

import { ethers } from 'ethers';
import * as fixtures from 'test/fixtures';
import { RequestErrorCode, RequestStatus } from 'src/types';
import * as apiCalls from './api-calls';

describe('submitApiCall', () => {
  const gasPrice = ethers.BigNumber.from('1000');
  const txOpts = { gasLimit: 500_000, gasPrice, nonce: 5 };

  describe('Fulfilled API calls', () => {
    it('does nothing for API call requests that have already been fulfilled', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      const apiCall = fixtures.requests.createApiCall({ status: RequestStatus.Fulfilled });
      const [logs, err, data] = await apiCalls.submitApiCall(contract, apiCall, { gasPrice });
      expect(logs).toEqual([]);
      expect(err).toEqual(null);
      expect(data).toEqual(null);
      expect(contract.callStatic.fulfill).not.toHaveBeenCalled();
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.callStatic.error).not.toHaveBeenCalled();
      expect(contract.error).not.toHaveBeenCalled();
      expect(contract.fail).not.toHaveBeenCalled();
    });
  });

  describe('Blocked API calls', () => {
    it('does not action blocked requests', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      const apiCall = fixtures.requests.createApiCall({ status: RequestStatus.Blocked });
      const [logs, err, data] = await apiCalls.submitApiCall(contract, apiCall, { gasPrice });
      expect(logs).toEqual([
        {
          level: 'INFO',
          message: `API call for Request:apiCallId not actioned as it has status:${RequestStatus.Blocked}`,
        },
      ]);
      expect(err).toEqual(null);
      expect(data).toEqual(null);
      expect(contract.callStatic.fulfill).not.toHaveBeenCalled();
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.callStatic.error).not.toHaveBeenCalled();
      expect(contract.error).not.toHaveBeenCalled();
      expect(contract.fail).not.toHaveBeenCalled();
    });
  });

  describe('Pending API calls', () => {
    it('successfully tests and submits a fulfill transaction for pending requests', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      (contract.callStatic.fulfill as jest.Mock).mockResolvedValueOnce({ callSuccess: true });
      contract.fulfill.mockResolvedValueOnce({ hash: '0xtransactionId' });
      const apiCall = fixtures.requests.createApiCall({ responseValue: '0xresponse', nonce: 5 });
      const [logs, err, data] = await apiCalls.submitApiCall(contract, apiCall, { gasPrice });
      expect(logs).toEqual([
        { level: 'DEBUG', message: 'Attempting to fulfill API call for Request:apiCallId...' },
        { level: 'INFO', message: 'Submitting API call fulfillment for Request:apiCallId...' },
      ]);
      expect(err).toEqual(null);
      expect(data).toEqual({ hash: '0xtransactionId' });
      expect(contract.callStatic.fulfill).toHaveBeenCalledTimes(1);
      expect(contract.callStatic.fulfill).toHaveBeenCalledWith(
        apiCall.id,
        '0xresponse',
        'fulfillAddress',
        'fulfillFunctionId',
        txOpts
      );
      expect(contract.fulfill).toHaveBeenCalledTimes(1);
      expect(contract.fulfill).toHaveBeenCalledWith(
        apiCall.id,
        '0xresponse',
        'fulfillAddress',
        'fulfillFunctionId',
        txOpts
      );
      expect(contract.callStatic.error).not.toHaveBeenCalled();
      expect(contract.error).not.toHaveBeenCalled();
    });

    it('returns an error if the fulfill transaction for pending requests fails', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      (contract.callStatic.fulfill as jest.Mock).mockResolvedValueOnce({ callSuccess: true });
      contract.fulfill.mockRejectedValueOnce(new Error('Server did not respond'));
      const apiCall = fixtures.requests.createApiCall({ responseValue: '0xresponse', nonce: 5 });
      const [logs, err, data] = await apiCalls.submitApiCall(contract, apiCall, { gasPrice });
      expect(logs).toEqual([
        { level: 'DEBUG', message: 'Attempting to fulfill API call for Request:apiCallId...' },
        { level: 'INFO', message: 'Submitting API call fulfillment for Request:apiCallId...' },
        {
          level: 'ERROR',
          message:
            'Error submitting API call fulfillment transaction for Request:apiCallId. Error: Server did not respond',
        },
      ]);
      expect(err).toEqual(new Error('Server did not respond'));
      expect(data).toEqual(null);
      expect(contract.callStatic.fulfill).toHaveBeenCalledTimes(1);
      expect(contract.callStatic.fulfill).toHaveBeenCalledWith(
        apiCall.id,
        '0xresponse',
        'fulfillAddress',
        'fulfillFunctionId',
        txOpts
      );
      expect(contract.fulfill).toHaveBeenCalledTimes(1);
      expect(contract.fulfill).toHaveBeenCalledWith(
        apiCall.id,
        '0xresponse',
        'fulfillAddress',
        'fulfillFunctionId',
        txOpts
      );
      expect(contract.callStatic.error).not.toHaveBeenCalled();
      expect(contract.error).not.toHaveBeenCalled();
    });

    it('submits an error transaction if the fulfill call would revert', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      (contract.callStatic.fulfill as jest.Mock).mockResolvedValueOnce({ callSuccess: false });
      (contract.callStatic.error as jest.Mock).mockResolvedValueOnce({ callSuccess: true });
      contract.error.mockResolvedValueOnce({ hash: '0xtransactionId' });
      const apiCall = fixtures.requests.createApiCall({ responseValue: '0xresponse', nonce: 5 });
      const [logs, err, data] = await apiCalls.submitApiCall(contract, apiCall, { gasPrice });
      expect(logs).toEqual([
        { level: 'DEBUG', message: 'Attempting to fulfill API call for Request:apiCallId...' },
        { level: 'DEBUG', message: 'Attempting to error API call for Request:apiCallId...' },
        { level: 'INFO', message: 'Submitting API call error for Request:apiCallId...' },
      ]);
      expect(err).toEqual(null);
      expect(data).toEqual({ hash: '0xtransactionId' });
      expect(contract.callStatic.fulfill).toHaveBeenCalledTimes(1);
      expect(contract.callStatic.fulfill).toHaveBeenCalledWith(
        apiCall.id,
        '0xresponse',
        'fulfillAddress',
        'fulfillFunctionId',
        txOpts
      );
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.callStatic.error).toHaveBeenCalledTimes(1);
      expect(contract.callStatic.error).toHaveBeenCalledWith(
        apiCall.id,
        RequestErrorCode.FulfillTransactionFailed,
        'errorAddress',
        'errorFunctionId',
        txOpts
      );
      expect(contract.error).toHaveBeenCalledTimes(1);
      expect(contract.error).toHaveBeenCalledWith(
        apiCall.id,
        RequestErrorCode.FulfillTransactionFailed,
        'errorAddress',
        'errorFunctionId',
        txOpts
      );
    });

    it('submits an error transaction if the test fulfill call fails', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      (contract.callStatic.fulfill as jest.Mock).mockRejectedValueOnce(new Error('Server did not respond'));
      (contract.callStatic.error as jest.Mock).mockResolvedValueOnce({ callSuccess: true });
      contract.error.mockResolvedValueOnce({ hash: '0xtransactionId' });
      const apiCall = fixtures.requests.createApiCall({ responseValue: '0xresponse', nonce: 5 });
      const [logs, err, data] = await apiCalls.submitApiCall(contract, apiCall, { gasPrice });
      expect(logs).toEqual([
        { level: 'DEBUG', message: 'Attempting to fulfill API call for Request:apiCallId...' },
        {
          level: 'ERROR',
          message: 'Error attempting API call fulfillment for Request:apiCallId. Error: Server did not respond',
        },
        { level: 'DEBUG', message: 'Attempting to error API call for Request:apiCallId...' },
        { level: 'INFO', message: 'Submitting API call error for Request:apiCallId...' },
      ]);
      expect(err).toEqual(null);
      expect(data).toEqual({ hash: '0xtransactionId' });
      expect(contract.callStatic.fulfill).toHaveBeenCalledTimes(1);
      expect(contract.callStatic.fulfill).toHaveBeenCalledWith(
        apiCall.id,
        '0xresponse',
        'fulfillAddress',
        'fulfillFunctionId',
        txOpts
      );
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.callStatic.error).toHaveBeenCalledTimes(1);
      expect(contract.callStatic.error).toHaveBeenCalledWith(
        apiCall.id,
        RequestErrorCode.FulfillTransactionFailed,
        'errorAddress',
        'errorFunctionId',
        txOpts
      );
      expect(contract.error).toHaveBeenCalledTimes(1);
      expect(contract.error).toHaveBeenCalledWith(
        apiCall.id,
        RequestErrorCode.FulfillTransactionFailed,
        'errorAddress',
        'errorFunctionId',
        txOpts
      );
    });

    it('submits a fail transaction if the both the fulfill and error attempts fail', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      (contract.callStatic.fulfill as jest.Mock).mockRejectedValueOnce(new Error('Server did not respond'));
      (contract.callStatic.error as jest.Mock).mockRejectedValueOnce(new Error('Server did not respond'));
      contract.fail.mockResolvedValueOnce({ hash: '0xtransactionId' });
      const apiCall = fixtures.requests.createApiCall({ responseValue: '0xresponse', nonce: 5 });
      const [logs, err, data] = await apiCalls.submitApiCall(contract, apiCall, { gasPrice });
      expect(logs).toEqual([
        { level: 'DEBUG', message: 'Attempting to fulfill API call for Request:apiCallId...' },
        {
          level: 'ERROR',
          message: 'Error attempting API call fulfillment for Request:apiCallId. Error: Server did not respond',
        },
        { level: 'DEBUG', message: 'Attempting to error API call for Request:apiCallId...' },
        {
          level: 'ERROR',
          message: 'Error attempting API call error for Request:apiCallId. Error: Server did not respond',
        },
        { level: 'INFO', message: 'Submitting API call fail for Request:apiCallId...' },
      ]);
      expect(err).toEqual(null);
      expect(data).toEqual({ hash: '0xtransactionId' });
      expect(contract.callStatic.fulfill).toHaveBeenCalledTimes(1);
      expect(contract.callStatic.fulfill).toHaveBeenCalledWith(
        apiCall.id,
        '0xresponse',
        'fulfillAddress',
        'fulfillFunctionId',
        txOpts
      );
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.callStatic.error).toHaveBeenCalledTimes(1);
      expect(contract.callStatic.error).toHaveBeenCalledWith(
        apiCall.id,
        RequestErrorCode.FulfillTransactionFailed,
        'errorAddress',
        'errorFunctionId',
        txOpts
      );
      expect(contract.error).not.toHaveBeenCalled();
      expect(contract.fail).toHaveBeenCalledWith(apiCall.id, txOpts);
    });

    it('does nothing if the the fulfill test returns nothing', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      (contract.callStatic.fulfill as jest.Mock).mockResolvedValueOnce(null);
      contract.fulfill.mockRejectedValueOnce(new Error('Server did not respond'));
      const apiCall = fixtures.requests.createApiCall({ responseValue: '0xresponse', nonce: 5 });
      const [logs, err, data] = await apiCalls.submitApiCall(contract, apiCall, { gasPrice });
      expect(logs).toEqual([
        { level: 'DEBUG', message: 'Attempting to fulfill API call for Request:apiCallId...' },
        { level: 'ERROR', message: "Fulfill attempt for Request:apiCallId responded with unexpected value: 'null'" },
      ]);
      expect(err).toEqual(null);
      expect(data).toEqual(null);
      expect(contract.callStatic.fulfill).toHaveBeenCalledTimes(1);
      expect(contract.callStatic.fulfill).toHaveBeenCalledWith(
        apiCall.id,
        '0xresponse',
        'fulfillAddress',
        'fulfillFunctionId',
        txOpts
      );
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.callStatic.error).not.toHaveBeenCalled();
      expect(contract.error).not.toHaveBeenCalled();
      expect(contract.fail).not.toHaveBeenCalled();
    });

    it('returns an error if everything fails', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      (contract.callStatic.fulfill as jest.Mock).mockRejectedValueOnce(new Error('Server did not respond'));
      (contract.callStatic.error as jest.Mock).mockRejectedValueOnce(new Error('Server did not respond'));
      contract.fail.mockRejectedValueOnce(new Error('Server still says no'));
      const apiCall = fixtures.requests.createApiCall({ responseValue: '0xresponse', nonce: 5 });
      const [logs, err, data] = await apiCalls.submitApiCall(contract, apiCall, { gasPrice });
      expect(logs).toEqual([
        { level: 'DEBUG', message: 'Attempting to fulfill API call for Request:apiCallId...' },
        {
          level: 'ERROR',
          message: 'Error attempting API call fulfillment for Request:apiCallId. Error: Server did not respond',
        },
        { level: 'DEBUG', message: 'Attempting to error API call for Request:apiCallId...' },
        {
          level: 'ERROR',
          message: 'Error attempting API call error for Request:apiCallId. Error: Server did not respond',
        },
        { level: 'INFO', message: 'Submitting API call fail for Request:apiCallId...' },
        {
          level: 'ERROR',
          message: 'Error submitting API call fail transaction for Request:apiCallId. Error: Server still says no',
        },
      ]);
      expect(err).toEqual(new Error('Server still says no'));
      expect(data).toEqual(null);
      expect(contract.callStatic.fulfill).toHaveBeenCalledTimes(1);
      expect(contract.callStatic.fulfill).toHaveBeenCalledWith(
        apiCall.id,
        '0xresponse',
        'fulfillAddress',
        'fulfillFunctionId',
        txOpts
      );
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.callStatic.error).toHaveBeenCalledTimes(1);
      expect(contract.callStatic.error).toHaveBeenCalledWith(
        apiCall.id,
        RequestErrorCode.FulfillTransactionFailed,
        'errorAddress',
        'errorFunctionId',
        txOpts
      );
      expect(contract.error).not.toHaveBeenCalled();
      expect(contract.fail).toHaveBeenCalledWith(apiCall.id, txOpts);
    });
  });

  describe('Errored API calls', () => {
    it('submits an error transaction for errored requests', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      (contract.callStatic.error as jest.Mock).mockResolvedValueOnce({ callSuccess: true });
      contract.error.mockResolvedValueOnce({ hash: '0xtransactionId' });
      const apiCall = fixtures.requests.createApiCall({
        errorCode: RequestErrorCode.ApiCallFailed,
        status: RequestStatus.Errored,
        nonce: 5,
      });
      const [logs, err, data] = await apiCalls.submitApiCall(contract, apiCall, { gasPrice });
      expect(logs).toEqual([
        { level: 'DEBUG', message: 'Attempting to error API call for Request:apiCallId...' },
        { level: 'INFO', message: 'Submitting API call error for Request:apiCallId...' },
      ]);
      expect(err).toEqual(null);
      expect(data).toEqual({ hash: '0xtransactionId' });
      expect(contract.callStatic.fulfill).not.toHaveBeenCalled();
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.callStatic.error).toHaveBeenCalledTimes(1);
      expect(contract.callStatic.error).toHaveBeenCalledWith(
        apiCall.id,
        RequestErrorCode.ApiCallFailed,
        'errorAddress',
        'errorFunctionId',
        txOpts
      );
      expect(contract.error).toHaveBeenCalledTimes(1);
      expect(contract.error).toHaveBeenCalledWith(
        apiCall.id,
        RequestErrorCode.ApiCallFailed,
        'errorAddress',
        'errorFunctionId',
        txOpts
      );
      expect(contract.fail).not.toHaveBeenCalled();
    });

    it('submits a fail transaction if the the test error fails', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      (contract.callStatic.error as jest.Mock).mockRejectedValueOnce(new Error('Server did not respond'));
      contract.fail.mockResolvedValueOnce({ hash: '0xtransactionId' });
      const apiCall = fixtures.requests.createApiCall({
        errorCode: RequestErrorCode.ApiCallFailed,
        status: RequestStatus.Errored,
        nonce: 5,
      });
      const [logs, err, data] = await apiCalls.submitApiCall(contract, apiCall, { gasPrice });
      expect(logs).toEqual([
        { level: 'DEBUG', message: 'Attempting to error API call for Request:apiCallId...' },
        {
          level: 'ERROR',
          message: 'Error attempting API call error for Request:apiCallId. Error: Server did not respond',
        },
        { level: 'INFO', message: 'Submitting API call fail for Request:apiCallId...' },
      ]);
      expect(err).toEqual(null);
      expect(data).toEqual({ hash: '0xtransactionId' });
      expect(contract.callStatic.fulfill).not.toHaveBeenCalled();
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.callStatic.error).toHaveBeenCalledTimes(1);
      expect(contract.callStatic.error).toHaveBeenCalledWith(
        apiCall.id,
        RequestErrorCode.ApiCallFailed,
        'errorAddress',
        'errorFunctionId',
        txOpts
      );
      expect(contract.error).not.toHaveBeenCalled();
      expect(contract.fail).toHaveBeenCalledWith(apiCall.id, txOpts);
    });

    it('submits a fail transaction if the the error transaction would revert', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      (contract.callStatic.error as jest.Mock).mockResolvedValueOnce({ callSuccess: false });
      contract.fail.mockResolvedValueOnce({ hash: '0xtransactionId' });
      const apiCall = fixtures.requests.createApiCall({
        errorCode: RequestErrorCode.ApiCallFailed,
        status: RequestStatus.Errored,
        nonce: 5,
      });
      const [logs, err, data] = await apiCalls.submitApiCall(contract, apiCall, { gasPrice });
      expect(logs).toEqual([
        { level: 'DEBUG', message: 'Attempting to error API call for Request:apiCallId...' },
        { level: 'INFO', message: 'Submitting API call fail for Request:apiCallId...' },
      ]);
      expect(err).toEqual(null);
      expect(data).toEqual({ hash: '0xtransactionId' });
      expect(contract.callStatic.fulfill).not.toHaveBeenCalled();
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.callStatic.error).toHaveBeenCalledTimes(1);
      expect(contract.callStatic.error).toHaveBeenCalledWith(
        apiCall.id,
        RequestErrorCode.ApiCallFailed,
        'errorAddress',
        'errorFunctionId',
        txOpts
      );
      expect(contract.error).not.toHaveBeenCalled();
      expect(contract.fail).toHaveBeenCalledWith(apiCall.id, txOpts);
    });

    it('returns an error if the error transaction fails', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      (contract.callStatic.error as jest.Mock).mockResolvedValueOnce({ callSuccess: true });
      contract.error.mockRejectedValueOnce(new Error('Server did not respond'));
      const apiCall = fixtures.requests.createApiCall({
        errorCode: RequestErrorCode.ApiCallFailed,
        status: RequestStatus.Errored,
        nonce: 5,
      });
      const [logs, err, data] = await apiCalls.submitApiCall(contract, apiCall, { gasPrice });
      expect(logs).toEqual([
        { level: 'DEBUG', message: 'Attempting to error API call for Request:apiCallId...' },
        { level: 'INFO', message: 'Submitting API call error for Request:apiCallId...' },
        {
          level: 'ERROR',
          message: 'Error submitting API call error transaction for Request:apiCallId. Error: Server did not respond',
        },
      ]);
      expect(err).toEqual(new Error('Server did not respond'));
      expect(data).toEqual(null);
      expect(contract.callStatic.fulfill).not.toHaveBeenCalled();
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.callStatic.error).toHaveBeenCalledTimes(1);
      expect(contract.callStatic.error).toHaveBeenCalledWith(
        apiCall.id,
        RequestErrorCode.ApiCallFailed,
        'errorAddress',
        'errorFunctionId',
        txOpts
      );
      expect(contract.error).toHaveBeenCalledTimes(1);
      expect(contract.error).toHaveBeenCalledWith(
        apiCall.id,
        RequestErrorCode.ApiCallFailed,
        'errorAddress',
        'errorFunctionId',
        txOpts
      );
      expect(contract.fail).not.toHaveBeenCalled();
    });

    it('does nothing if the the error test returns nothing', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      (contract.callStatic.error as jest.Mock).mockResolvedValueOnce(null);
      contract.error.mockRejectedValueOnce(new Error('Server did not respond'));
      const apiCall = fixtures.requests.createApiCall({
        errorCode: RequestErrorCode.ApiCallFailed,
        status: RequestStatus.Errored,
        nonce: 5,
      });
      const [logs, err, data] = await apiCalls.submitApiCall(contract, apiCall, { gasPrice });
      expect(logs).toEqual([
        { level: 'DEBUG', message: 'Attempting to error API call for Request:apiCallId...' },
        { level: 'ERROR', message: "Error attempt for Request:apiCallId responded with unexpected value: 'null'" },
      ]);
      expect(err).toEqual(null);
      expect(data).toEqual(null);
      expect(contract.callStatic.fulfill).not.toHaveBeenCalled();
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.callStatic.error).toHaveBeenCalledTimes(1);
      expect(contract.callStatic.error).toHaveBeenCalledWith(
        apiCall.id,
        RequestErrorCode.ApiCallFailed,
        'errorAddress',
        'errorFunctionId',
        txOpts
      );
      expect(contract.error).not.toHaveBeenCalled();
      expect(contract.fail).not.toHaveBeenCalled();
    });
  });
});
