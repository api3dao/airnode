const errorMock = jest.fn();
const estimateWithdrawalGasMock = jest.fn();
const fulfillMock = jest.fn();
const fulfillWalletDesignationMock = jest.fn();
const fulfillWithdrawalMock = jest.fn();
jest.mock('ethers', () => ({
  ethers: {
    ...jest.requireActual('ethers'),
    Contract: jest.fn().mockImplementation(() => ({
      error: errorMock,
      estimateGas: { fulfillWithdrawal: estimateWithdrawalGasMock },
      fulfill: fulfillMock,
      fulfillWalletDesignation: fulfillWalletDesignationMock,
      fulfillWithdrawal: fulfillWithdrawalMock,
    })),
  },
}));

jest.mock('../config', () => ({
  security: {
    masterKeyMnemonic: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
  },
}));

import { ethers } from 'ethers';
import * as fixtures from 'test/fixtures';
import { ProviderState, RequestErrorCode, RequestStatus, RequestType, WalletData } from 'src/types';
import * as providerState from '../providers/state';
import * as submitting from './submitting';

describe('submit', () => {
  let initialState: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1337, url: 'https://some.provider', name: 'test-provider' };
    initialState = providerState.create(config, 0);
  });

  describe('API calls', () => {
    it('submits a fulfill transaction for pending requests', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      contract.fulfill.mockResolvedValueOnce({ hash: '0xsuccessful' });
      const gasPrice = ethers.BigNumber.from('1000');
      const apiCall = fixtures.requests.createApiCall({ response: { value: '0xresponse' }, nonce: 5 });
      const walletData: WalletData = {
        address: '0x123',
        requests: {
          apiCalls: [apiCall],
          walletDesignations: [],
          withdrawals: [],
        },
        transactionCount: 4,
      };
      const state = providerState.update(initialState, { gasPrice, walletDataByIndex: { 8: walletData } });
      const res = await submitting.submit(state);
      expect(res).toEqual([{ id: apiCall.id, type: RequestType.ApiCall, transactionHash: '0xsuccessful' }]);
      expect(contract.error).not.toHaveBeenCalled();
      expect(contract.fulfillWalletDesignation).not.toHaveBeenCalled();
      expect(contract.fulfillWithdrawal).not.toHaveBeenCalled();
      expect(contract.fulfill).toHaveBeenCalledTimes(1);
      expect(contract.fulfill).toHaveBeenCalledWith(apiCall.id, '0xresponse', 'fulfillAddress', 'fulfillFunctionId', {
        gasLimit: 500000,
        gasPrice,
      });
    });

    it('submits an error transaction for errored requests', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      contract.error.mockResolvedValueOnce({ hash: '0xerrored' });
      const apiCall = fixtures.requests.createApiCall({
        errorCode: RequestErrorCode.ApiCallFailed,
        nonce: 5,
        status: RequestStatus.Errored,
      });
      const gasPrice = ethers.BigNumber.from('1000');
      const walletData: WalletData = {
        address: '0x123',
        requests: {
          apiCalls: [apiCall],
          walletDesignations: [],
          withdrawals: [],
        },
        transactionCount: 4,
      };
      const state = providerState.update(initialState, { gasPrice, walletDataByIndex: { 8: walletData } });
      const res = await submitting.submit(state);
      expect(res).toEqual([{ id: apiCall.id, type: RequestType.ApiCall, transactionHash: '0xerrored' }]);
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.fulfillWalletDesignation).not.toHaveBeenCalled();
      expect(contract.fulfillWithdrawal).not.toHaveBeenCalled();
      expect(contract.error).toHaveBeenCalledTimes(1);
      expect(contract.error).toHaveBeenCalledWith(
        apiCall.id,
        RequestErrorCode.ApiCallFailed,
        'errorAddress',
        'errorFunctionId',
        { gasPrice }
      );
    });

    it('does nothing if the request is fulfilled', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      const apiCall = fixtures.requests.createApiCall({ status: RequestStatus.Fulfilled });
      const walletData: WalletData = {
        address: '0x123',
        requests: {
          apiCalls: [apiCall],
          walletDesignations: [],
          withdrawals: [],
        },
        transactionCount: 4,
      };
      const state = providerState.update(initialState, { walletDataByIndex: { 8: walletData } });
      const res = await submitting.submit(state);
      expect(res).toEqual([]);
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.fulfillWalletDesignation).not.toHaveBeenCalled();
      expect(contract.fulfillWithdrawal).not.toHaveBeenCalled();
      expect(contract.error).not.toHaveBeenCalled();
    });

    it('does nothing if the request is blocked', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      const apiCall = fixtures.requests.createApiCall({ status: RequestStatus.Blocked });
      const walletData: WalletData = {
        address: '0x123',
        requests: {
          apiCalls: [apiCall],
          walletDesignations: [],
          withdrawals: [],
        },
        transactionCount: 4,
      };
      const state = providerState.update(initialState, { walletDataByIndex: { 8: walletData } });
      const res = await submitting.submit(state);
      expect(res).toEqual([]);
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.fulfillWalletDesignation).not.toHaveBeenCalled();
      expect(contract.fulfillWithdrawal).not.toHaveBeenCalled();
      expect(contract.error).not.toHaveBeenCalled();
    });

    it('returns nothing if the transaction fails to submit', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      contract.fulfill.mockRejectedValueOnce(new Error('Server failed to respond'));
      const gasPrice = ethers.BigNumber.from('1000');
      const apiCall = fixtures.requests.createApiCall({ response: { value: '0xresponse' }, nonce: 5 });
      const walletData: WalletData = {
        address: '0x123',
        requests: {
          apiCalls: [apiCall],
          walletDesignations: [],
          withdrawals: [],
        },
        transactionCount: 4,
      };
      const state = providerState.update(initialState, { gasPrice, walletDataByIndex: { 8: walletData } });
      const res = await submitting.submit(state);
      expect(res).toEqual([]);
      expect(contract.fulfillWalletDesignation).not.toHaveBeenCalled();
      expect(contract.fulfillWithdrawal).not.toHaveBeenCalled();
      expect(contract.error).not.toHaveBeenCalled();
      expect(contract.fulfill).toHaveBeenCalledTimes(1);
      expect(contract.fulfill).toHaveBeenCalledWith(apiCall.id, '0xresponse', 'fulfillAddress', 'fulfillFunctionId', {
        gasLimit: 500000,
        gasPrice,
      });
    });
  });

  describe('wallet designations', () => {
    it('submits a fulfill transaction for pending requests', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      contract.fulfillWalletDesignation.mockResolvedValueOnce({ hash: '0xsuccessful' });
      const gasPrice = ethers.BigNumber.from('1000');
      const walletDesignation = fixtures.requests.createWalletDesignation({ status: RequestStatus.Pending });
      const walletData: WalletData = {
        address: '0x123',
        requests: {
          apiCalls: [],
          walletDesignations: [walletDesignation],
          withdrawals: [],
        },
        transactionCount: 4,
      };
      const state = providerState.update(initialState, { gasPrice, walletDataByIndex: { 0: walletData } });
      const res = await submitting.submit(state);
      expect(res).toEqual([
        { id: walletDesignation.id, type: RequestType.WalletDesignation, transactionHash: '0xsuccessful' },
      ]);
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.fulfillWithdrawal).not.toHaveBeenCalled();
      expect(contract.error).not.toHaveBeenCalled();
      expect(contract.fulfillWalletDesignation).toHaveBeenCalledTimes(1);
      expect(contract.fulfillWalletDesignation).toHaveBeenCalledWith(
        walletDesignation.id,
        walletDesignation.walletIndex,
        { gasPrice, gasLimit: 150000 }
      );
    });

    it('does nothing if the request is fulfilled, blocked or errored', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      const fulfilled = fixtures.requests.createWalletDesignation({ status: RequestStatus.Fulfilled });
      const blocked = fixtures.requests.createWalletDesignation({ status: RequestStatus.Blocked });
      const errored = fixtures.requests.createWalletDesignation({ status: RequestStatus.Errored });
      const walletData: WalletData = {
        address: '0x123',
        requests: {
          apiCalls: [],
          walletDesignations: [fulfilled, blocked, errored],
          withdrawals: [],
        },
        transactionCount: 4,
      };
      const state = providerState.update(initialState, { walletDataByIndex: { 0: walletData } });
      const res = await submitting.submit(state);
      expect(res).toEqual([]);
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.fulfillWalletDesignation).not.toHaveBeenCalled();
      expect(contract.fulfillWithdrawal).not.toHaveBeenCalled();
      expect(contract.error).not.toHaveBeenCalled();
    });

    it('returns nothing if the transaction fails to submit', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      contract.fulfillWalletDesignation.mockRejectedValueOnce(new Error('Server failed to respond'));
      const gasPrice = ethers.BigNumber.from('1000');
      const walletDesignation = fixtures.requests.createWalletDesignation({ status: RequestStatus.Pending });
      const walletData: WalletData = {
        address: '0x123',
        requests: {
          apiCalls: [],
          walletDesignations: [walletDesignation],
          withdrawals: [],
        },
        transactionCount: 4,
      };
      const state = providerState.update(initialState, { gasPrice, walletDataByIndex: { 0: walletData } });
      const res = await submitting.submit(state);
      expect(res).toEqual([]);
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.fulfillWithdrawal).not.toHaveBeenCalled();
      expect(contract.error).not.toHaveBeenCalled();
      expect(contract.fulfillWalletDesignation).toHaveBeenCalledTimes(1);
      expect(contract.fulfillWalletDesignation).toHaveBeenCalledWith(
        walletDesignation.id,
        walletDesignation.walletIndex,
        { gasPrice, gasLimit: 150000 }
      );
    });
  });

  describe('withdrawals', () => {
    beforeEach(() => {
      estimateWithdrawalGasMock.mockResolvedValueOnce(ethers.BigNumber.from('1000'));
      const spy = jest.spyOn(initialState.provider, 'getBalance');
      spy.mockResolvedValueOnce(ethers.BigNumber.from('2500000'));
    });

    it('returns all of the requester funds minus the transaction cost', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      contract.fulfillWithdrawal.mockResolvedValueOnce({ hash: '0xsuccessful' });
      const gasPrice = ethers.BigNumber.from('1000');
      const withdrawal = fixtures.requests.createWithdrawal({ status: RequestStatus.Pending });
      const walletData: WalletData = {
        address: '0x123',
        requests: {
          apiCalls: [],
          walletDesignations: [],
          withdrawals: [withdrawal],
        },
        transactionCount: 4,
      };
      const state = providerState.update(initialState, { gasPrice, walletDataByIndex: { 3: walletData } });
      const res = await submitting.submit(state);
      expect(res).toEqual([{ id: withdrawal.id, type: RequestType.Withdrawal, transactionHash: '0xsuccessful' }]);
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.fulfillWalletDesignation).not.toHaveBeenCalled();
      expect(contract.error).not.toHaveBeenCalled();
      expect(contract.fulfillWithdrawal).toHaveBeenCalledTimes(1);
      expect(contract.fulfillWithdrawal).toHaveBeenCalledWith(withdrawal.id, {
        gasPrice,
        gasLimit: ethers.BigNumber.from('1000'),
        // 2500000 - (1000 * 1000)
        value: ethers.BigNumber.from('1500000'),
      });
    });

    it('does nothing if the request is fulfilled, blocked or errored', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      const gasPrice = ethers.BigNumber.from('1000');
      const blocked = fixtures.requests.createWithdrawal({ status: RequestStatus.Blocked });
      const fulfilled = fixtures.requests.createWithdrawal({ status: RequestStatus.Fulfilled });
      const errored = fixtures.requests.createWithdrawal({ status: RequestStatus.Errored });
      const walletData: WalletData = {
        address: '0x123',
        requests: {
          apiCalls: [],
          walletDesignations: [],
          withdrawals: [blocked, fulfilled, errored],
        },
        transactionCount: 4,
      };
      const state = providerState.update(initialState, { gasPrice, walletDataByIndex: { 3: walletData } });
      const res = await submitting.submit(state);
      expect(res).toEqual([]);
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.fulfillWalletDesignation).not.toHaveBeenCalled();
      expect(contract.fulfillWithdrawal).not.toHaveBeenCalled();
      expect(contract.error).not.toHaveBeenCalled();
    });

    it('returns nothing if the transaction fails to submit', async () => {
      const contract = new ethers.Contract('address', ['ABI']);
      contract.fulfillWithdrawal.mockRejectedValueOnce(new Error('Server failed to respond'));
      const withdrawal = fixtures.requests.createWithdrawal({ status: RequestStatus.Pending });
      const walletData: WalletData = {
        address: '0x123',
        requests: {
          apiCalls: [],
          walletDesignations: [],
          withdrawals: [withdrawal],
        },
        transactionCount: 4,
      };
      const state = providerState.update(initialState, { walletDataByIndex: { 3: walletData } });
      const res = await submitting.submit(state);
      expect(res).toEqual([]);
      expect(contract.fulfill).not.toHaveBeenCalled();
      expect(contract.fulfillWalletDesignation).not.toHaveBeenCalled();
      expect(contract.fulfillWithdrawal).not.toHaveBeenCalled();
      expect(contract.error).not.toHaveBeenCalled();
    });
  });
});
