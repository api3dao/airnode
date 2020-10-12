const connectMock = jest.fn();
const errorMock = jest.fn();
const estimateWithdrawalGasMock = jest.fn();
const failMock = jest.fn();
const fulfillMock = jest.fn();
const fulfillWalletDesignationMock = jest.fn();
const fulfillWithdrawalMock = jest.fn();
const getBalanceMock = jest.fn();
const staticErrorMock = jest.fn();
const staticFulfillMock = jest.fn();
jest.mock('ethers', () => ({
  ethers: {
    ...jest.requireActual('ethers'),
    providers: {
      JsonRpcProvider: jest.fn().mockImplementation(() => ({
        getBalance: getBalanceMock,
      })),
    },
    Contract: jest.fn().mockImplementation(() => ({
      callStatic: {
        error: staticErrorMock,
        fulfill: staticFulfillMock,
      },
      error: errorMock,
      estimateGas: { fulfillWithdrawal: estimateWithdrawalGasMock },
      fail: failMock,
      fulfill: fulfillMock,
      fulfillWalletDesignation: fulfillWalletDesignationMock,
      fulfillWithdrawal: fulfillWithdrawalMock,
    })),
    Wallet: jest.fn().mockImplementation(() => ({
      connect: connectMock,
    })),
  },
}));

jest.mock('../../config', () => ({
  security: {
    masterKeyMnemonic: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
  },
}));

import { ethers } from 'ethers';
import * as fixtures from 'test/fixtures';
import { EVMProviderState, ProviderState, RequestType, WalletData } from 'src/types';
import * as providerState from '../../providers/state';
import * as transactions from './index';

describe('submit', () => {
  let initialState: ProviderState<EVMProviderState>;

  beforeEach(() => {
    initialState = fixtures.createEVMProviderState();
  });

  it('submits transactions for multiple wallets and returns the transactions', async () => {
    const adminWalletData: WalletData = {
      address: '0xadminwallet',
      requests: {
        apiCalls: [],
        walletDesignations: [
          fixtures.requests.createWalletDesignation({ id: '0x3', nonce: 10, walletIndex: '6' }),
          fixtures.requests.createWalletDesignation({ id: '0x4', nonce: 11, walletIndex: '7' }),
        ],
        withdrawals: [],
      },
      transactionCount: 10,
    };
    const wallet1Data: WalletData = {
      address: '0xwallet1',
      requests: {
        apiCalls: [
          fixtures.requests.createApiCall({ id: '0x1', nonce: 5, responseValue: '0xresponse' }),
          fixtures.requests.createApiCall({ id: '0x2', nonce: 6, responseValue: '0xresponse' }),
        ],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 5,
    };
    const wallet2Data: WalletData = {
      address: '0xwallet2',
      requests: {
        apiCalls: [],
        walletDesignations: [],
        withdrawals: [fixtures.requests.createWithdrawal({ id: '0x5', nonce: 3 })],
      },
      transactionCount: 3,
    };
    const gasPrice = ethers.BigNumber.from('1000');
    const provider = new ethers.providers.JsonRpcProvider();
    const walletDataByIndex = { 0: adminWalletData, 8: wallet1Data, 9: wallet2Data };
    const state = providerState.update(initialState, { gasPrice, provider, walletDataByIndex });

    const contract = new ethers.Contract('address', ['ABI']);
    (contract.callStatic.fulfill as jest.Mock).mockResolvedValue({ callSuccess: true });
    contract.fulfill.mockResolvedValueOnce({ hash: '0xapicall_tx1' });
    contract.fulfill.mockResolvedValueOnce({ hash: '0xapicall_tx2' });
    contract.fulfillWalletDesignation.mockResolvedValueOnce({ hash: '0xwalletdesignation_tx1' });
    contract.fulfillWalletDesignation.mockResolvedValueOnce({ hash: '0xwalletdesignation_tx2' });
    (provider.getBalance as jest.Mock).mockResolvedValue(ethers.BigNumber.from('2500000'));
    (contract.estimateGas.fulfillWithdrawal as jest.Mock).mockResolvedValue(ethers.BigNumber.from('500'));
    contract.fulfillWithdrawal.mockResolvedValueOnce({ hash: '0xwithdrawal_tx1' });

    const res = await transactions.submit(state);
    expect(res.length).toEqual(5);

    const apiCallReceipts = res.filter((r) => r.type === RequestType.ApiCall);
    expect(apiCallReceipts).toEqual([
      { id: '0x1', type: RequestType.ApiCall, data: { hash: '0xapicall_tx1' } },
      { id: '0x2', type: RequestType.ApiCall, data: { hash: '0xapicall_tx2' } },
    ]);

    const designationReceipts = res.filter((r) => r.type === RequestType.WalletDesignation);
    expect(designationReceipts).toEqual([
      { id: '0x3', type: RequestType.WalletDesignation, data: { hash: '0xwalletdesignation_tx1' } },
      { id: '0x4', type: RequestType.WalletDesignation, data: { hash: '0xwalletdesignation_tx2' } },
    ]);

    const withdrawalReceipts = res.filter((r) => r.type === RequestType.Withdrawal);
    expect(withdrawalReceipts).toEqual([
      { id: '0x5', type: RequestType.Withdrawal, data: { hash: '0xwithdrawal_tx1' } },
    ]);
  });

  it('returns error responses for API calls', async () => {
    const apiCall = fixtures.requests.createApiCall({ id: '0x1', nonce: 5, responseValue: '0xresponse' });
    const wallet1Data: WalletData = {
      address: '0xwallet1',
      requests: {
        apiCalls: [apiCall],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 5,
    };
    const gasPrice = ethers.BigNumber.from('1000');
    const provider = new ethers.providers.JsonRpcProvider();
    const walletDataByIndex = { 8: wallet1Data };
    const state = providerState.update(initialState, { gasPrice, provider, walletDataByIndex });

    const contract = new ethers.Contract('address', ['ABI']);
    (contract.callStatic.fulfill as jest.Mock).mockResolvedValue({ callSuccess: true });
    contract.fulfill.mockRejectedValueOnce(new Error('Server did not respond'));

    const res = await transactions.submit(state);
    expect(res).toEqual([{ id: apiCall.id, type: RequestType.ApiCall, error: new Error('Server did not respond') }]);
  });

  it('returns error responses for wallet designations', async () => {
    const walletDesignation = fixtures.requests.createWalletDesignation({ id: '0x3', nonce: 10, walletIndex: '6' });
    const adminWalletData: WalletData = {
      address: '0xadminwallet',
      requests: {
        apiCalls: [],
        walletDesignations: [walletDesignation],
        withdrawals: [],
      },
      transactionCount: 10,
    };
    const gasPrice = ethers.BigNumber.from('1000');
    const provider = new ethers.providers.JsonRpcProvider();
    const walletDataByIndex = { 0: adminWalletData };
    const state = providerState.update(initialState, { gasPrice, provider, walletDataByIndex });

    const contract = new ethers.Contract('address', ['ABI']);
    contract.fulfillWalletDesignation.mockRejectedValueOnce(new Error('Server did not respond'));

    const res = await transactions.submit(state);
    expect(res).toEqual([
      { id: walletDesignation.id, type: RequestType.WalletDesignation, error: new Error('Server did not respond') },
    ]);
  });

  it('returns error responses for withdrawals', async () => {
    const withdrawal = fixtures.requests.createWithdrawal({ id: '0x5', nonce: 3 });
    const wallet1Data: WalletData = {
      address: '0xwallet2',
      requests: {
        apiCalls: [],
        walletDesignations: [],
        withdrawals: [withdrawal],
      },
      transactionCount: 3,
    };
    const gasPrice = ethers.BigNumber.from('1000');
    const provider = new ethers.providers.JsonRpcProvider();
    const walletDataByIndex = { 9: wallet1Data };
    const state = providerState.update(initialState, { gasPrice, provider, walletDataByIndex });

    const contract = new ethers.Contract('address', ['ABI']);
    (provider.getBalance as jest.Mock).mockResolvedValue(ethers.BigNumber.from('2500000'));
    (contract.estimateGas.fulfillWithdrawal as jest.Mock).mockResolvedValue(ethers.BigNumber.from('500'));
    contract.fulfillWithdrawal.mockRejectedValueOnce(new Error('Server did not respond'));

    const res = await transactions.submit(state);
    expect(res).toEqual([
      { id: withdrawal.id, type: RequestType.Withdrawal, error: new Error('Server did not respond') },
    ]);
  });
});
