const failMock = jest.fn();
const fulfillMock = jest.fn();
const staticFulfillMock = jest.fn();
jest.mock('ethers', () => ({
  ethers: {
    ...jest.requireActual('ethers'),
    Contract: jest.fn().mockImplementation(() => ({
      callStatic: {
        fulfill: staticFulfillMock,
      },
      fail: failMock,
      fulfill: fulfillMock,
    })),
  },
}));

import { ethers } from 'ethers';
import * as fixtures from 'test/fixtures';
import * as apiCalls from './api-calls';
import * as wallet from '../wallet';
import { RequestErrorCode, RequestStatus } from 'src/types';

describe('submitApiCall', () => {
  const gasPrice = ethers.BigNumber.from('1000');
  const txOpts = { gasLimit: 500_000, gasPrice, nonce: 5 };

  let xpub: string;

  beforeEach(() => {
    const masterHDNode = wallet.getMasterHDNode();
    xpub = wallet.getExtendedPublicKey(masterHDNode);
  });

  describe('Fulfilled API calls', () => {
    it('does nothing for API call requests that have already been fulfilled', async () => {
      const provider = new ethers.providers.JsonRpcProvider();
      const contract = new ethers.Contract('address', ['ABI']);
      const apiCall = fixtures.requests.createApiCall({ status: RequestStatus.Fulfilled });
      const [logs, err, data] = await apiCalls.submitApiCall(contract, apiCall, { gasPrice, provider, xpub });
      expect(logs).toEqual([
        {
          level: 'DEBUG',
          message: `API call for Request:${apiCall.id} not actioned as it has status:${apiCall.status}`,
        },
      ]);
      expect(err).toEqual(null);
      expect(data).toEqual(null);
      expect(contract.callStatic.fulfill).not.toHaveBeenCalled();
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.fail).not.toHaveBeenCalled();
    });
  });

  describe('Blocked API calls', () => {
    it('does not action blocked requests', async () => {
      const provider = new ethers.providers.JsonRpcProvider();
      const contract = new ethers.Contract('address', ['ABI']);
      const apiCall = fixtures.requests.createApiCall({ status: RequestStatus.Blocked });
      const [logs, err, data] = await apiCalls.submitApiCall(contract, apiCall, { gasPrice, provider, xpub });
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
      expect(contract.fail).not.toHaveBeenCalled();
    });
  });

  describe('Pending API calls', () => {
    it('successfully tests and submits a fulfill transaction for pending requests', async () => {
      const provider = new ethers.providers.JsonRpcProvider();
      const contract = new ethers.Contract('address', ['ABI']);
      (contract.callStatic.fulfill as jest.Mock).mockResolvedValueOnce({ callSuccess: true });
      contract.fulfill.mockResolvedValueOnce({ hash: '0xtransactionId' });
      const apiCall = fixtures.requests.createApiCall({ responseValue: '0xresponse', nonce: 5 });
      const [logs, err, data] = await apiCalls.submitApiCall(contract, apiCall, { gasPrice, provider, xpub });
      expect(logs).toEqual([
        { level: 'DEBUG', message: `Attempting to fulfill API call with status code:0 for Request:${apiCall.id}...` },
        { level: 'INFO', message: `Submitting API call fulfillment with status code:0 for Request:${apiCall.id}...` },
      ]);
      expect(err).toEqual(null);
      expect(data).toEqual({ hash: '0xtransactionId' });
      expect(contract.callStatic.fulfill).toHaveBeenCalledTimes(1);
      expect(contract.callStatic.fulfill).toHaveBeenCalledWith(
        apiCall.id,
        apiCall.providerId,
        ethers.BigNumber.from('0'),
        '0xresponse',
        apiCall.fulfillAddress,
        apiCall.fulfillFunctionId,
        txOpts
      );
      expect(contract.fulfill).toHaveBeenCalledTimes(1);
      expect(contract.fulfill).toHaveBeenCalledWith(
        apiCall.id,
        apiCall.providerId,
        ethers.BigNumber.from('0'),
        '0xresponse',
        apiCall.fulfillAddress,
        apiCall.fulfillFunctionId,
        txOpts
      );
      expect(contract.fail).not.toHaveBeenCalled();
    });

    it('returns an error if the fulfill transaction for pending requests fails', async () => {
      const provider = new ethers.providers.JsonRpcProvider();
      const contract = new ethers.Contract('address', ['ABI']);
      (contract.callStatic.fulfill as jest.Mock).mockResolvedValueOnce({ callSuccess: true });
      contract.fulfill.mockRejectedValueOnce(new Error('Server did not respond'));
      const apiCall = fixtures.requests.createApiCall({ responseValue: '0xresponse', nonce: 5 });
      const [logs, err, data] = await apiCalls.submitApiCall(contract, apiCall, { gasPrice, provider, xpub });
      expect(logs).toEqual([
        { level: 'DEBUG', message: `Attempting to fulfill API call with status code:0 for Request:${apiCall.id}...` },
        { level: 'INFO', message: `Submitting API call fulfillment with status code:0 for Request:${apiCall.id}...` },
        {
          error: new Error('Server did not respond'),
          level: 'ERROR',
          message: 'Error submitting API call fulfillment transaction for Request:apiCallId',
        },
      ]);
      expect(err).toEqual(new Error('Server did not respond'));
      expect(data).toEqual(null);
      expect(contract.callStatic.fulfill).toHaveBeenCalledTimes(1);
      expect(contract.callStatic.fulfill).toHaveBeenCalledWith(
        apiCall.id,
        apiCall.providerId,
        ethers.BigNumber.from('0'),
        '0xresponse',
        apiCall.fulfillAddress,
        apiCall.fulfillFunctionId,
        txOpts
      );
      expect(contract.fulfill).toHaveBeenCalledTimes(1);
      expect(contract.fulfill).toHaveBeenCalledWith(
        apiCall.id,
        apiCall.providerId,
        ethers.BigNumber.from('0'),
        '0xresponse',
        apiCall.fulfillAddress,
        apiCall.fulfillFunctionId,
        txOpts
      );
      expect(contract.fail).not.toHaveBeenCalled();
    });

    it('submits a fail transaction if the fulfill call would revert', async () => {
      const provider = new ethers.providers.JsonRpcProvider();
      const contract = new ethers.Contract('address', ['ABI']);
      (contract.callStatic.fulfill as jest.Mock).mockResolvedValueOnce({ callSuccess: false });
      (contract.fail as jest.Mock).mockResolvedValueOnce({ hash: '0xfailtransaction' });
      const apiCall = fixtures.requests.createApiCall({ responseValue: '0xresponse', nonce: 5 });
      const [logs, err, data] = await apiCalls.submitApiCall(contract, apiCall, { gasPrice, provider, xpub });
      expect(logs).toEqual([
        { level: 'DEBUG', message: `Attempting to fulfill API call with status code:0 for Request:${apiCall.id}...` },
        { level: 'INFO', message: `Submitting API call fail for Request:${apiCall.id}...` },
      ]);
      expect(err).toEqual(null);
      expect(data).toEqual({ hash: '0xfailtransaction' });
      expect(contract.callStatic.fulfill).toHaveBeenCalledTimes(1);
      expect(contract.callStatic.fulfill).toHaveBeenCalledWith(
        apiCall.id,
        apiCall.providerId,
        ethers.BigNumber.from('0'),
        '0xresponse',
        apiCall.fulfillAddress,
        apiCall.fulfillFunctionId,
        txOpts
      );
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.fail).toHaveBeenCalledTimes(1);
      expect(contract.fail).toHaveBeenCalledWith(
        apiCall.id,
        apiCall.providerId,
        apiCall.fulfillAddress,
        apiCall.fulfillFunctionId,
        txOpts
      );
    });

    it('does nothing if the the fulfill test returns nothing', async () => {
      const provider = new ethers.providers.JsonRpcProvider();
      const contract = new ethers.Contract('address', ['ABI']);
      (contract.callStatic.fulfill as jest.Mock).mockResolvedValueOnce(null);
      const apiCall = fixtures.requests.createApiCall({ responseValue: '0xresponse', nonce: 5 });
      const [logs, err, data] = await apiCalls.submitApiCall(contract, apiCall, { gasPrice, provider, xpub });
      expect(logs).toEqual([
        { level: 'DEBUG', message: `Attempting to fulfill API call with status code:0 for Request:${apiCall.id}...` },
        {
          level: 'ERROR',
          message: `Fulfill attempt for Request:${apiCall.id} responded with unexpected value: 'null'`,
        },
      ]);
      expect(err).toEqual(null);
      expect(data).toEqual(null);
      expect(contract.callStatic.fulfill).toHaveBeenCalledTimes(1);
      expect(contract.callStatic.fulfill).toHaveBeenCalledWith(
        apiCall.id,
        apiCall.providerId,
        ethers.BigNumber.from('0'),
        '0xresponse',
        apiCall.fulfillAddress,
        apiCall.fulfillFunctionId,
        txOpts
      );
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.fail).not.toHaveBeenCalled();
    });

    it('returns an error if everything fails', async () => {
      const provider = new ethers.providers.JsonRpcProvider();
      const contract = new ethers.Contract('address', ['ABI']);
      (contract.callStatic.fulfill as jest.Mock).mockRejectedValueOnce(new Error('Server did not respond'));
      contract.fail.mockRejectedValueOnce(new Error('Server still says no'));
      const apiCall = fixtures.requests.createApiCall({ responseValue: '0xresponse', nonce: 5 });
      const [logs, err, data] = await apiCalls.submitApiCall(contract, apiCall, { gasPrice, provider, xpub });
      expect(logs).toEqual([
        { level: 'DEBUG', message: `Attempting to fulfill API call with status code:0 for Request:${apiCall.id}...` },
        {
          error: new Error('Server did not respond'),
          level: 'ERROR',
          message: `Error attempting API call fulfillment for Request:${apiCall.id}`,
        },
        { level: 'INFO', message: `Submitting API call fail for Request:${apiCall.id}...` },
        {
          error: new Error('Server still says no'),
          level: 'ERROR',
          message: `Error submitting API call fail transaction for Request:${apiCall.id}`,
        },
      ]);
      expect(err).toEqual(new Error('Server still says no'));
      expect(data).toEqual(null);
      expect(contract.callStatic.fulfill).toHaveBeenCalledTimes(1);
      expect(contract.callStatic.fulfill).toHaveBeenCalledWith(
        apiCall.id,
        apiCall.providerId,
        ethers.BigNumber.from('0'),
        '0xresponse',
        apiCall.fulfillAddress,
        apiCall.fulfillFunctionId,
        txOpts
      );
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.fail).toHaveBeenCalledTimes(1);
      expect(contract.fail).toHaveBeenCalledWith(
        apiCall.id,
        apiCall.providerId,
        apiCall.fulfillAddress,
        apiCall.fulfillFunctionId,
        txOpts
      );
    });
  });

  describe('Errored API calls', () => {
    it('forwards the error code for errored requests', async () => {
      const provider = new ethers.providers.JsonRpcProvider();
      const contract = new ethers.Contract('address', ['ABI']);
      (contract.callStatic.fulfill as jest.Mock).mockResolvedValueOnce({ callSuccess: true });
      contract.fulfill.mockResolvedValueOnce({ hash: '0xtransactionId' });
      const apiCall = fixtures.requests.createApiCall({
        errorCode: RequestErrorCode.ApiCallFailed,
        status: RequestStatus.Errored,
        nonce: 5,
      });
      const [logs, err, data] = await apiCalls.submitApiCall(contract, apiCall, { gasPrice, provider, xpub });
      expect(logs).toEqual([
        {
          level: 'DEBUG',
          message: `Attempting to fulfill API call with status code:${RequestErrorCode.ApiCallFailed} for Request:${apiCall.id}...`,
        },
        {
          level: 'INFO',
          message: `Submitting API call fulfillment with status code:${RequestErrorCode.ApiCallFailed} for Request:${apiCall.id}...`,
        },
      ]);
      expect(err).toEqual(null);
      expect(data).toEqual({ hash: '0xtransactionId' });
      expect(contract.callStatic.fulfill).toHaveBeenCalledTimes(1);
      expect(contract.callStatic.fulfill).toHaveBeenCalledWith(
        apiCall.id,
        apiCall.providerId,
        ethers.BigNumber.from(RequestErrorCode.ApiCallFailed),
        ethers.constants.HashZero,
        apiCall.fulfillAddress,
        apiCall.fulfillFunctionId,
        txOpts
      );
      expect(contract.fulfill).toHaveBeenCalledTimes(1);
      expect(contract.fulfill).toHaveBeenCalledWith(
        apiCall.id,
        apiCall.providerId,
        ethers.BigNumber.from(RequestErrorCode.ApiCallFailed),
        ethers.constants.HashZero,
        apiCall.fulfillAddress,
        apiCall.fulfillFunctionId,
        txOpts
      );
      expect(contract.fail).not.toHaveBeenCalled();
    });

    it('submits a fail transaction if the the error transaction would revert', async () => {
      const provider = new ethers.providers.JsonRpcProvider();
      const contract = new ethers.Contract('address', ['ABI']);
      (contract.callStatic.fulfill as jest.Mock).mockResolvedValueOnce({ callSuccess: false });
      contract.fail.mockResolvedValueOnce({ hash: '0xtransactionId' });
      const apiCall = fixtures.requests.createApiCall({
        errorCode: RequestErrorCode.ApiCallFailed,
        status: RequestStatus.Errored,
        nonce: 5,
      });
      const [logs, err, data] = await apiCalls.submitApiCall(contract, apiCall, { gasPrice, provider, xpub });
      expect(logs).toEqual([
        {
          level: 'DEBUG',
          message: `Attempting to fulfill API call with status code:${RequestErrorCode.ApiCallFailed} for Request:${apiCall.id}...`,
        },
        { level: 'INFO', message: `Submitting API call fail for Request:${apiCall.id}...` },
      ]);
      expect(err).toEqual(null);
      expect(data).toEqual({ hash: '0xtransactionId' });
      expect(contract.callStatic.fulfill).toHaveBeenCalledTimes(1);
      expect(contract.callStatic.fulfill).toHaveBeenCalledWith(
        apiCall.id,
        apiCall.providerId,
        ethers.BigNumber.from(RequestErrorCode.ApiCallFailed),
        ethers.constants.HashZero,
        apiCall.fulfillAddress,
        apiCall.fulfillFunctionId,
        txOpts
      );
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.fail).toHaveBeenCalledTimes(1);
      expect(contract.fail).toHaveBeenCalledWith(
        apiCall.id,
        apiCall.providerId,
        apiCall.fulfillAddress,
        apiCall.fulfillFunctionId,
        txOpts
      );
    });

    it('returns an error if the error transaction fails', async () => {
      const provider = new ethers.providers.JsonRpcProvider();
      const contract = new ethers.Contract('address', ['ABI']);
      (contract.callStatic.fulfill as jest.Mock).mockResolvedValueOnce({ callSuccess: true });
      contract.fulfill.mockRejectedValueOnce(new Error('Server did not respond'));
      const apiCall = fixtures.requests.createApiCall({
        errorCode: RequestErrorCode.ApiCallFailed,
        status: RequestStatus.Errored,
        nonce: 5,
      });
      const [logs, err, data] = await apiCalls.submitApiCall(contract, apiCall, { gasPrice, provider, xpub });
      expect(logs).toEqual([
        {
          level: 'DEBUG',
          message: `Attempting to fulfill API call with status code:${RequestErrorCode.ApiCallFailed} for Request:${apiCall.id}...`,
        },
        {
          level: 'INFO',
          message: `Submitting API call fulfillment with status code:${RequestErrorCode.ApiCallFailed} for Request:${apiCall.id}...`,
        },
        {
          error: new Error('Server did not respond'),
          level: 'ERROR',
          message: `Error submitting API call fulfillment transaction for Request:${apiCall.id}`,
        },
      ]);
      expect(err).toEqual(new Error('Server did not respond'));
      expect(data).toEqual(null);
      expect(contract.callStatic.fulfill).toHaveBeenCalledTimes(1);
      expect(contract.callStatic.fulfill).toHaveBeenCalledWith(
        apiCall.id,
        apiCall.providerId,
        ethers.BigNumber.from(RequestErrorCode.ApiCallFailed),
        ethers.constants.HashZero,
        apiCall.fulfillAddress,
        apiCall.fulfillFunctionId,
        txOpts
      );
      expect(contract.fulfill).toHaveBeenCalledTimes(1);
      expect(contract.fulfill).toHaveBeenCalledWith(
        apiCall.id,
        apiCall.providerId,
        ethers.BigNumber.from(RequestErrorCode.ApiCallFailed),
        ethers.constants.HashZero,
        apiCall.fulfillAddress,
        apiCall.fulfillFunctionId,
        txOpts
      );
      expect(contract.fail).not.toHaveBeenCalled();
    });

    it('does nothing if the the error test returns nothing', async () => {
      const provider = new ethers.providers.JsonRpcProvider();
      const contract = new ethers.Contract('address', ['ABI']);
      (contract.callStatic.fulfill as jest.Mock).mockResolvedValueOnce(null);
      const apiCall = fixtures.requests.createApiCall({
        errorCode: RequestErrorCode.ApiCallFailed,
        status: RequestStatus.Errored,
        nonce: 5,
      });
      const [logs, err, data] = await apiCalls.submitApiCall(contract, apiCall, { gasPrice, provider, xpub });
      expect(logs).toEqual([
        {
          level: 'DEBUG',
          message: `Attempting to fulfill API call with status code:${RequestErrorCode.ApiCallFailed} for Request:${apiCall.id}...`,
        },
        {
          level: 'ERROR',
          message: `Fulfill attempt for Request:${apiCall.id} responded with unexpected value: 'null'`,
        },
      ]);
      expect(err).toEqual(null);
      expect(data).toEqual(null);
      expect(contract.callStatic.fulfill).toHaveBeenCalledTimes(1);
      expect(contract.callStatic.fulfill).toHaveBeenCalledWith(
        apiCall.id,
        apiCall.providerId,
        ethers.BigNumber.from(RequestErrorCode.ApiCallFailed),
        ethers.constants.HashZero,
        apiCall.fulfillAddress,
        apiCall.fulfillFunctionId,
        txOpts
      );
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.fail).not.toHaveBeenCalled();
    });
  });
});
