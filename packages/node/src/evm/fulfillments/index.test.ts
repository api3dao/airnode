import { mockEthers } from '../../../test/mock-utils';
const estimateWithdrawalGasMock = jest.fn();
const failMock = jest.fn();
const fulfillMock = jest.fn();
const fulfillWithdrawalMock = jest.fn();
const staticFulfillMock = jest.fn();
mockEthers({
  airnodeRrpMocks: {
    callStatic: {
      fulfill: staticFulfillMock,
    },
    estimateGas: { fulfillWithdrawal: estimateWithdrawalGasMock },
    fail: failMock,
    fulfill: fulfillMock,
    fulfillWithdrawal: fulfillWithdrawalMock,
  },
});

import { ethers } from 'ethers';
import * as fixtures from '../../../test/fixtures';
import { EVMProviderState, GroupedRequests, ProviderState, RequestStatus, RequestType } from '../../types';
import * as providerState from '../../providers/state';
import * as fulfillments from './index';

describe('submit', () => {
  let mutableInitialState: ProviderState<EVMProviderState>;

  beforeEach(() => {
    mutableInitialState = fixtures.buildEVMProviderState();
  });

  it('submits transactions for multiple wallets and returns the transactions', async () => {
    const requests: GroupedRequests = {
      apiCalls: [
        fixtures.requests.buildApiCall({
          id: '0x1',
          nonce: 10,
          sponsorAddress: '0x641eeb15B15d8E2CFB5f9d6480B175d93c14e6B6',
        }),
        fixtures.requests.buildApiCall({
          id: '0x2',
          nonce: 11,
          sponsorAddress: '0x641eeb15B15d8E2CFB5f9d6480B175d93c14e6B6',
        }),
      ],
      withdrawals: [
        fixtures.requests.buildWithdrawal({
          id: '0x5',
          nonce: 3,
          sponsorAddress: '0x212b5E1221057415074541852F1D4D9337BF9ca6',
        }),
      ],
    };
    const gasPrice = ethers.BigNumber.from(1000);
    const provider = new ethers.providers.JsonRpcProvider();
    const state = providerState.update(mutableInitialState, { gasPrice, provider, requests });

    staticFulfillMock.mockResolvedValue({ callSuccess: true });
    fulfillMock.mockResolvedValueOnce({ hash: '0xapicall_tx1' });
    fulfillMock.mockResolvedValueOnce({ hash: '0xapicall_tx2' });
    const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
    balanceSpy.mockResolvedValue(ethers.BigNumber.from(250_000_000));
    estimateWithdrawalGasMock.mockResolvedValue(ethers.BigNumber.from(50_000));
    fulfillWithdrawalMock.mockResolvedValueOnce({ hash: '0xwithdrawal_tx1' });

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
    const apiCall = fixtures.requests.buildApiCall({
      id: '0x1',
      nonce: 5,
      responseValue: '0xresponse',
      sponsorAddress: '0x641eeb15B15d8E2CFB5f9d6480B175d93c14e6B6',
    });
    const requests: GroupedRequests = {
      apiCalls: [apiCall],
      withdrawals: [],
    };
    const gasPrice = ethers.BigNumber.from(1000);
    const provider = new ethers.providers.JsonRpcProvider();
    const state = providerState.update(mutableInitialState, { gasPrice, provider, requests });

    staticFulfillMock.mockResolvedValue({ callSuccess: true });
    fulfillMock.mockRejectedValueOnce(new Error('Server did not respond'));
    fulfillMock.mockRejectedValueOnce(new Error('Server did not respond'));

    const res = await fulfillments.submit(state);
    expect(res).toEqual([{ id: apiCall.id, type: RequestType.ApiCall, error: new Error('Server did not respond') }]);
  });

  it('returns error responses for withdrawals', async () => {
    const withdrawal = fixtures.requests.buildWithdrawal({
      id: '0x5',
      nonce: 3,
      sponsorAddress: '0x641eeb15B15d8E2CFB5f9d6480B175d93c14e6B6',
    });
    const requests: GroupedRequests = {
      apiCalls: [],
      withdrawals: [withdrawal],
    };
    const gasPrice = ethers.BigNumber.from(1000);
    const provider = new ethers.providers.JsonRpcProvider();
    const state = providerState.update(mutableInitialState, { gasPrice, provider, requests });

    const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
    balanceSpy.mockResolvedValue(ethers.BigNumber.from(250_000_000));
    estimateWithdrawalGasMock.mockResolvedValue(ethers.BigNumber.from(50_000));
    fulfillWithdrawalMock.mockRejectedValueOnce(new Error('Server did not respond'));
    fulfillWithdrawalMock.mockRejectedValueOnce(new Error('Server did not respond'));

    const res = await fulfillments.submit(state);
    expect(res).toEqual([
      { id: withdrawal.id, type: RequestType.Withdrawal, error: new Error('Server did not respond') },
    ]);
  });
});

describe('applyFulfillments', () => {
  it('does nothing to requests without a receipt', () => {
    const apiCall = fixtures.requests.buildApiCall({ id: '0xapicallId' });
    const receipt = fixtures.evm.receipts.buildTransactionReceipt({ id: '0xunknown' });
    const res = fulfillments.applyFulfillments([apiCall], [receipt]);
    expect(res[0]).toEqual(apiCall);
  });

  it('does nothing when receipts do not have a transaction hash', () => {
    const apiCall = fixtures.requests.buildApiCall({ id: '0xapicallId' });
    const receipt = fixtures.evm.receipts.buildTransactionReceipt({ id: '0xapicallId' });
    // eslint-disable-next-line functional/immutable-data
    receipt.data!.hash = undefined;
    const res = fulfillments.applyFulfillments([apiCall], [receipt]);
    expect(res[0]).toEqual(apiCall);
  });

  it('applies fulfillment data to API calls', () => {
    const apiCall = fixtures.requests.buildApiCall({ id: '0xapicallId' });
    const receipt = fixtures.evm.receipts.buildTransactionReceipt({ id: '0xapicallId' });
    const res = fulfillments.applyFulfillments([apiCall], [receipt]);
    expect(res[0]).toEqual({ ...apiCall, status: RequestStatus.Submitted, fulfillment: { hash: '0xtransactionId' } });
  });

  it('applies fulfillment data to withdrawals', () => {
    const withdrawal = fixtures.requests.buildWithdrawal({ id: '0xreceipt' });
    const receipt = fixtures.evm.receipts.buildTransactionReceipt({ id: '0xreceipt' });
    const res = fulfillments.applyFulfillments([withdrawal], [receipt]);
    expect(res[0]).toEqual({
      ...withdrawal,
      status: RequestStatus.Submitted,
      fulfillment: { hash: '0xtransactionId' },
    });
  });
});
