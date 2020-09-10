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

  describe('Pending API calls', () => {
    it('successfully tests and submits a fulfill transaction for pending requests', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      (contract.callStatic.fulfill as jest.Mock).mockResolvedValueOnce({ callSuccess: true });
      contract.fulfill.mockResolvedValueOnce({ hash: '0xtransactionId' });
      const apiCall = fixtures.requests.createApiCall({ response: { value: '0xresponse' }, nonce: 5 });
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
      const apiCall = fixtures.requests.createApiCall({ response: { value: '0xresponse' }, nonce: 5 });
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
      const apiCall = fixtures.requests.createApiCall({ response: { value: '0xresponse' }, nonce: 5 });
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
      expect(contract.callStatic.error).toHaveBeenCalledWith(apiCall.id, 99, 'errorAddress', 'errorFunctionId', txOpts);
      expect(contract.error).toHaveBeenCalledTimes(1);
      expect(contract.error).toHaveBeenCalledWith(apiCall.id, 99, 'errorAddress', 'errorFunctionId', txOpts);
    });

    it('submits an error transaction if the test fulfill call fails', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      (contract.callStatic.fulfill as jest.Mock).mockRejectedValueOnce(new Error('Server did not respond'));
      (contract.callStatic.error as jest.Mock).mockResolvedValueOnce({ callSuccess: true });
      contract.error.mockResolvedValueOnce({ hash: '0xtransactionId' });
      const apiCall = fixtures.requests.createApiCall({ response: { value: '0xresponse' }, nonce: 5 });
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
      expect(contract.callStatic.error).toHaveBeenCalledWith(apiCall.id, 99, 'errorAddress', 'errorFunctionId', txOpts);
      expect(contract.error).toHaveBeenCalledTimes(1);
      expect(contract.error).toHaveBeenCalledWith(apiCall.id, 99, 'errorAddress', 'errorFunctionId', txOpts);
    });

    it('submits a fail transaction if the both the fulfill and error attempts fail', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      (contract.callStatic.fulfill as jest.Mock).mockRejectedValueOnce(new Error('Server did not respond'));
      (contract.callStatic.error as jest.Mock).mockRejectedValueOnce(new Error('Server did not respond'));
      contract.fail.mockResolvedValueOnce({ hash: '0xtransactionId' });
      const apiCall = fixtures.requests.createApiCall({ response: { value: '0xresponse' }, nonce: 5 });
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
      expect(contract.callStatic.error).toHaveBeenCalledWith(apiCall.id, 99, 'errorAddress', 'errorFunctionId', txOpts);
      expect(contract.error).not.toHaveBeenCalled();
      expect(contract.fail).toHaveBeenCalledWith(apiCall.id, txOpts);
    });

    it('returns an error if everything fails', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      (contract.callStatic.fulfill as jest.Mock).mockRejectedValueOnce(new Error('Server did not respond'));
      (contract.callStatic.error as jest.Mock).mockRejectedValueOnce(new Error('Server did not respond'));
      contract.fail.mockRejectedValueOnce(new Error('Server still says no'));
      const apiCall = fixtures.requests.createApiCall({ response: { value: '0xresponse' }, nonce: 5 });
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
      expect(contract.callStatic.error).toHaveBeenCalledWith(apiCall.id, 99, 'errorAddress', 'errorFunctionId', txOpts);
      expect(contract.error).not.toHaveBeenCalled();
      expect(contract.fail).toHaveBeenCalledWith(apiCall.id, txOpts);
    });
  });

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
      {
        gasLimit: 500000,
        gasPrice,
        nonce: 5,
      }
    );
    expect(contract.error).toHaveBeenCalledTimes(1);
    expect(contract.error).toHaveBeenCalledWith(
      apiCall.id,
      RequestErrorCode.ApiCallFailed,
      'errorAddress',
      'errorFunctionId',
      {
        gasLimit: 500000,
        gasPrice,
        nonce: 5,
      }
    );
  });

  //
  // it('submits an error transaction for errored requests', async () => {
  //   const contract = new ethers.Contract('address', ['ABI']);
  //   contract.error.mockResolvedValueOnce({ hash: '0xerrored' });
  //   const apiCall = fixtures.requests.createApiCall({
  //     errorCode: RequestErrorCode.ApiCallFailed,
  //     nonce: 5,
  //     status: RequestStatus.Errored,
  //   });
  //   const gasPrice = ethers.BigNumber.from('1000');
  //   const walletData: WalletData = {
  //     address: '0x123',
  //     requests: {
  //       apiCalls: [apiCall],
  //       walletDesignations: [],
  //       withdrawals: [],
  //     },
  //     transactionCount: 5,
  //   };
  //   const state = providerState.update(initialState, { gasPrice, walletDataByIndex: { 8: walletData } });
  //   const res = await transactions.submit(state);
  //   expect(res).toEqual([{ id: apiCall.id, type: RequestType.ApiCall, transactionHash: '0xerrored' }]);
  //   expect(contract.fulfill).not.toHaveBeenCalled();
  //   expect(contract.fulfillWalletDesignation).not.toHaveBeenCalled();
  //   expect(contract.fulfillWithdrawal).not.toHaveBeenCalled();
  //   expect(contract.error).toHaveBeenCalledTimes(1);
  //   expect(contract.error).toHaveBeenCalledWith(
  //     apiCall.id,
  //     RequestErrorCode.ApiCallFailed,
  //     'errorAddress',
  //     'errorFunctionId',
  //     { gasPrice, nonce: 5 }
  //   );
  // });
  //
  // it('does nothing if the request is fulfilled', async () => {
  //   const contract = new ethers.Contract('address', ['ABI']);
  //   const apiCall = fixtures.requests.createApiCall({ status: RequestStatus.Fulfilled });
  //   const walletData: WalletData = {
  //     address: '0x123',
  //     requests: {
  //       apiCalls: [apiCall],
  //       walletDesignations: [],
  //       withdrawals: [],
  //     },
  //     transactionCount: 5,
  //   };
  //   const state = providerState.update(initialState, { walletDataByIndex: { 8: walletData } });
  //   const res = await transactions.submit(state);
  //   expect(res).toEqual([]);
  //   expect(contract.fulfill).not.toHaveBeenCalled();
  //   expect(contract.fulfillWalletDesignation).not.toHaveBeenCalled();
  //   expect(contract.fulfillWithdrawal).not.toHaveBeenCalled();
  //   expect(contract.error).not.toHaveBeenCalled();
  // });
  //
  // it('does nothing if the request is blocked', async () => {
  //   const contract = new ethers.Contract('address', ['ABI']);
  //   const apiCall = fixtures.requests.createApiCall({ status: RequestStatus.Blocked });
  //   const walletData: WalletData = {
  //     address: '0x123',
  //     requests: {
  //       apiCalls: [apiCall],
  //       walletDesignations: [],
  //       withdrawals: [],
  //     },
  //     transactionCount: 5,
  //   };
  //   const state = providerState.update(initialState, { walletDataByIndex: { 8: walletData } });
  //   const res = await transactions.submit(state);
  //   expect(res).toEqual([]);
  //   expect(contract.fulfill).not.toHaveBeenCalled();
  //   expect(contract.fulfillWalletDesignation).not.toHaveBeenCalled();
  //   expect(contract.fulfillWithdrawal).not.toHaveBeenCalled();
  //   expect(contract.error).not.toHaveBeenCalled();
  // });
  //
  // it('returns nothing if the transaction fails to submit', async () => {
  //   const contract = new ethers.Contract('address', ['ABI']);
  //   contract.fulfill.mockRejectedValueOnce(new Error('Server failed to respond'));
  //   const gasPrice = ethers.BigNumber.from('1000');
  //   const apiCall = fixtures.requests.createApiCall({ response: { value: '0xresponse' }, nonce: 5 });
  //   const walletData: WalletData = {
  //     address: '0x123',
  //     requests: {
  //       apiCalls: [apiCall],
  //       walletDesignations: [],
  //       withdrawals: [],
  //     },
  //     transactionCount: 5,
  //   };
  //   const state = providerState.update(initialState, { gasPrice, walletDataByIndex: { 8: walletData } });
  //   const res = await transactions.submit(state);
  //   expect(res).toEqual([]);
  //   expect(contract.fulfillWalletDesignation).not.toHaveBeenCalled();
  //   expect(contract.fulfillWithdrawal).not.toHaveBeenCalled();
  //   expect(contract.error).not.toHaveBeenCalled();
  //   expect(contract.fulfill).toHaveBeenCalledTimes(1);
  //   expect(contract.fulfill).toHaveBeenCalledWith(apiCall.id, '0xresponse', 'fulfillAddress', 'fulfillFunctionId', {
  //     gasLimit: 500000,
  //     gasPrice,
  //     nonce: 5,
  //   });
  // });
});
