import { ethers } from 'ethers';
import { processTransactions } from './process-transactions';
import * as fixtures from 'test/fixtures';
import { GroupedRequests } from '../../types';

const estimateGasWithdrawalMock = jest.fn();
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
      estimateGas: {
        fulfillWithdrawal: estimateGasWithdrawalMock,
      },
      fail: failMock,
      fulfill: fulfillMock,
      fulfillWithdrawal: fulfillWithdrawalMock,
    })),
  },
}));

describe('processTransactions', () => {
  it('fetches the gas price, assigns nonces and submits transactions', async () => {
    const contract = new ethers.Contract('address', ['ABI']);

    const gasPrice = ethers.BigNumber.from(1000);
    const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
    gasPriceSpy.mockResolvedValueOnce(gasPrice);

    const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
    balanceSpy.mockResolvedValueOnce(ethers.BigNumber.from(250_000_000));

    (contract.estimateGas.fulfillWithdrawal as jest.Mock).mockResolvedValueOnce(ethers.BigNumber.from(50_000));
    (contract.callStatic.fulfill as jest.Mock).mockResolvedValueOnce({ callSuccess: true });
    contract.fulfill.mockResolvedValueOnce({
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
    expect(res.requests.apiCalls[0]).toEqual({ ...apiCall, nonce: 79 });
    expect(res.requests.withdrawals[0]).toEqual({ ...withdrawal, nonce: 212 });
    expect(res.gasPrice).toEqual(ethers.BigNumber.from('1000'));

    // Withdrawal was submitted
    expect(contract.fulfillWithdrawal).toHaveBeenCalledTimes(1);
    expect(contract.fulfillWithdrawal).toHaveBeenCalledWith(
      withdrawal.id,
      withdrawal.airnodeId,
      withdrawal.requesterIndex,
      withdrawal.destinationAddress,
      {
        gasPrice,
        gasLimit: ethers.BigNumber.from(70_000),
        nonce: 212,
        // 250_000_000 - ((50_000 + 20_000) * 1000)
        value: ethers.BigNumber.from(180_000_000),
      }
    );

    // API call was submitted
    expect(contract.fulfill).toHaveBeenCalledTimes(1);
    expect(contract.fulfill).toHaveBeenCalledWith(
      apiCall.id,
      apiCall.airnodeId,
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
