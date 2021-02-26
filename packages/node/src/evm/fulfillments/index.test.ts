const connectMock = jest.fn();
const estimateWithdrawalGasMock = jest.fn();
const failMock = jest.fn();
const fulfillMock = jest.fn();
const fulfillWithdrawalMock = jest.fn();
const staticFulfillMock = jest.fn();
jest.mock('ethers', () => ({
  ethers: {
    ...jest.requireActual('ethers'),
    Contract: jest.fn().mockImplementation(() => ({
      callStatic: {
        fulfill: staticFulfillMock,
      },
      estimateGas: { fulfillWithdrawal: estimateWithdrawalGasMock },
      fail: failMock,
      fulfill: fulfillMock,
      fulfillWithdrawal: fulfillWithdrawalMock,
    })),
    Wallet: jest.fn().mockImplementation(() => ({
      connect: connectMock,
    })),
  },
}));

import { ethers } from 'ethers';
import * as fixtures from 'test/fixtures';
import { EVMProviderState, GroupedRequests, ProviderState, RequestType } from 'src/types';
import * as providerState from '../../providers/state';
import * as fulfillments from './index';

describe('submit', () => {
  let initialState: ProviderState<EVMProviderState>;

  beforeEach(() => {
    initialState = fixtures.buildEVMProviderState();
  });

  it('submits transactions for multiple wallets and returns the transactions', async () => {
    const requests: GroupedRequests = {
      apiCalls: [
        fixtures.requests.buildApiCall({ id: '0x1', nonce: 10, requesterIndex: '6' }),
        fixtures.requests.buildApiCall({ id: '0x2', nonce: 11, requesterIndex: '7' }),
      ],
      withdrawals: [fixtures.requests.createWithdrawal({ id: '0x5', nonce: 3, requesterIndex: '8' })],
    };
    const gasPrice = ethers.BigNumber.from(1000);
    const provider = new ethers.providers.JsonRpcProvider();
    const state = providerState.update(initialState, { gasPrice, provider, requests });

    const contract = new ethers.Contract('address', ['ABI']);
    (contract.callStatic.fulfill as jest.Mock).mockResolvedValue({ callSuccess: true });
    contract.fulfill.mockResolvedValueOnce({ hash: '0xapicall_tx1' });
    contract.fulfill.mockResolvedValueOnce({ hash: '0xapicall_tx2' });
    const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
    balanceSpy.mockResolvedValue(ethers.BigNumber.from(250_000_000));
    (contract.estimateGas.fulfillWithdrawal as jest.Mock).mockResolvedValue(ethers.BigNumber.from(50_000));
    contract.fulfillWithdrawal.mockResolvedValueOnce({ hash: '0xwithdrawal_tx1' });

    const res = await fulfillments.submit(state);
    expect(res.length).toEqual(3);

    const apiCallReceipts = res.filter((r) => r.type === RequestType.ApiCall);
    expect(apiCallReceipts).toEqual([
      { id: '0x1', type: RequestType.ApiCall, data: { hash: '0xapicall_tx1' } },
      { id: '0x2', type: RequestType.ApiCall, data: { hash: '0xapicall_tx2' } },
    ]);

    const withdrawalReceipts = res.filter((r) => r.type === RequestType.Withdrawal);
    expect(withdrawalReceipts).toEqual([
      { id: '0x5', type: RequestType.Withdrawal, data: { hash: '0xwithdrawal_tx1' } },
    ]);
  });

  it('returns error responses for API calls', async () => {
    const apiCall = fixtures.requests.buildApiCall({ id: '0x1', nonce: 5, responseValue: '0xresponse' });
    const requests: GroupedRequests = {
      apiCalls: [apiCall],
      withdrawals: [],
    };
    const gasPrice = ethers.BigNumber.from(1000);
    const provider = new ethers.providers.JsonRpcProvider();
    const state = providerState.update(initialState, { gasPrice, provider, requests });

    const contract = new ethers.Contract('address', ['ABI']);
    (contract.callStatic.fulfill as jest.Mock).mockResolvedValue({ callSuccess: true });
    contract.fulfill.mockRejectedValueOnce(new Error('Server did not respond'));
    contract.fulfill.mockRejectedValueOnce(new Error('Server did not respond'));

    const res = await fulfillments.submit(state);
    expect(res).toEqual([{ id: apiCall.id, type: RequestType.ApiCall, error: new Error('Server did not respond') }]);
  });

  it('returns error responses for withdrawals', async () => {
    const withdrawal = fixtures.requests.createWithdrawal({ id: '0x5', nonce: 3 });
    const requests: GroupedRequests = {
      apiCalls: [],
      withdrawals: [withdrawal],
    };
    const gasPrice = ethers.BigNumber.from(1000);
    const provider = new ethers.providers.JsonRpcProvider();
    const state = providerState.update(initialState, { gasPrice, provider, requests });

    const contract = new ethers.Contract('address', ['ABI']);
    const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
    balanceSpy.mockResolvedValue(ethers.BigNumber.from(250_000_000));
    (contract.estimateGas.fulfillWithdrawal as jest.Mock).mockResolvedValue(ethers.BigNumber.from(50_000));
    contract.fulfillWithdrawal.mockRejectedValueOnce(new Error('Server did not respond'));
    contract.fulfillWithdrawal.mockRejectedValueOnce(new Error('Server did not respond'));

    const res = await fulfillments.submit(state);
    expect(res).toEqual([
      { id: withdrawal.id, type: RequestType.Withdrawal, error: new Error('Server did not respond') },
    ]);
  });
});
