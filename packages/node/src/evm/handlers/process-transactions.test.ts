import { mockEthers } from '../../../test/mock-utils';
const estimateGasWithdrawalMock = jest.fn();
const failMock = jest.fn();
const fulfillMock = jest.fn();
const fulfillWithdrawalMock = jest.fn();
const staticFulfillMock = jest.fn();
mockEthers({
  airnodeRrpMocks: {
    callStatic: {
      fulfill: staticFulfillMock,
    },
    estimateGas: {
      fulfillWithdrawal: estimateGasWithdrawalMock,
    },
    fail: failMock,
    fulfill: fulfillMock,
    fulfillWithdrawal: fulfillWithdrawalMock,
  },
});

import { ethers } from 'ethers';
import { processTransactions } from './process-transactions';
import * as fixtures from '../../../test/fixtures';
import { GroupedRequests, RequestStatus } from '../../types';

describe('processTransactions', () => {
  it('fetches the gas price, assigns nonces and submits transactions', async () => {
    const gasPrice = ethers.BigNumber.from(1000);
    const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
    gasPriceSpy.mockResolvedValueOnce(gasPrice);

    const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
    balanceSpy.mockResolvedValueOnce(ethers.BigNumber.from(250_000_000));

    estimateGasWithdrawalMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
    fulfillWithdrawalMock.mockResolvedValueOnce({
      hash: '0xcbb3f9dc6a24e8b6f5427dcf960b1da01c3df0636cb25a292f8dcaad78755c8d',
    });
    staticFulfillMock.mockResolvedValueOnce({ callSuccess: true });
    fulfillMock.mockResolvedValueOnce({
      hash: '0xad33fe94de7294c6ab461325828276185dff6fed92c54b15ac039c6160d2bac3',
    });

    const apiCall = fixtures.requests.buildSubmittableApiCall({ requesterIndex: '4' });
    const withdrawal = fixtures.requests.buildWithdrawal({ requesterIndex: '5' });
    const requests: GroupedRequests = {
      apiCalls: [apiCall],
      withdrawals: [withdrawal],
    };
    const transactionCountsByRequesterIndex = { 4: 79, 5: 212 };
    const state = fixtures.buildEVMProviderState({ requests, transactionCountsByRequesterIndex });

    const res = await processTransactions(state);
    expect(res.requests.apiCalls[0]).toEqual({
      ...apiCall,
      nonce: 79,
      fulfillment: { hash: '0xad33fe94de7294c6ab461325828276185dff6fed92c54b15ac039c6160d2bac3' },
      status: RequestStatus.Submitted,
    });
    expect(res.requests.withdrawals[0]).toEqual({
      ...withdrawal,
      nonce: 212,
      fulfillment: { hash: '0xcbb3f9dc6a24e8b6f5427dcf960b1da01c3df0636cb25a292f8dcaad78755c8d' },
      status: RequestStatus.Submitted,
    });
    expect(res.gasPrice).toEqual(ethers.BigNumber.from('1000'));

    // Withdrawal was submitted
    expect(fulfillWithdrawalMock).toHaveBeenCalledTimes(1);
    expect(fulfillWithdrawalMock).toHaveBeenCalledWith(
      withdrawal.id,
      withdrawal.airnodeAddress,
      withdrawal.requesterIndex,
      {
        gasPrice,
        gasLimit: ethers.BigNumber.from(70_000),
        nonce: 212,
        // 250_000_000 - ((50_000 + 20_000) * 1000)
        value: ethers.BigNumber.from(180_000_000),
      }
    );

    // API call was submitted
    expect(fulfillMock).toHaveBeenCalledTimes(1);
    expect(fulfillMock).toHaveBeenCalledWith(
      apiCall.id,
      apiCall.airnodeAddress,
      ethers.BigNumber.from('0'),
      '0x000000000000000000000000000000000000000000000000000000000001252b',
      apiCall.fulfillAddress,
      apiCall.fulfillFunctionId,
      { gasLimit: 500_000, gasPrice, nonce: 79 }
    );
  });

  it('does not submit transactions if a gas price cannot be fetched', async () => {
    const contract = new ethers.Contract('address', ['ABI']);
    const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
    gasPriceSpy.mockRejectedValue(new Error('Gas price cannot be fetched'));

    const apiCall = fixtures.requests.buildSubmittableApiCall({ requesterIndex: '4' });
    const requests: GroupedRequests = {
      apiCalls: [apiCall],
      withdrawals: [],
    };
    const transactionCountsByRequesterIndex = { 4: 79 };
    const state = fixtures.buildEVMProviderState({ requests, transactionCountsByRequesterIndex });

    const res = await processTransactions(state);
    expect(res.requests.apiCalls[0]).toEqual({ ...apiCall, nonce: 79 });
    expect(res.gasPrice).toEqual(null);

    // API call was NOT submitted
    expect(contract.fulfill).not.toHaveBeenCalled();
  });
});
