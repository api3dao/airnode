import { createAndMockGasTarget, mockEthers } from '../../../test/mock-utils';

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

import fs from 'fs';
import { ethers } from 'ethers';
import { processTransactions } from './process-transactions';
import * as fixtures from '../../../test/fixtures';
import { GroupedRequests, RequestStatus } from '../../types';

describe('processTransactions', () => {
  test.each(['1', '2'] as const)(
    'fetches the gas price, assigns nonces and submits transactions - txType: %d',
    async (txType) => {
      const initialConfig = fixtures.buildConfig();
      const config = {
        ...initialConfig,
        chains: initialConfig.chains.map((chain) => ({
          ...chain,
          options: {
            txType,
          },
        })),
      };
      const { gasTarget, blockSpy, gasPriceSpy } = createAndMockGasTarget(txType);

      const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
      const balance = ethers.utils.parseEther('1000');
      balanceSpy.mockResolvedValueOnce(ethers.BigNumber.from(balance));

      estimateGasWithdrawalMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
      fulfillWithdrawalMock.mockResolvedValueOnce({
        hash: '0xcbb3f9dc6a24e8b6f5427dcf960b1da01c3df0636cb25a292f8dcaad78755c8d',
      });
      staticFulfillMock.mockResolvedValueOnce({ callSuccess: true });
      fulfillMock.mockResolvedValueOnce({
        hash: '0xad33fe94de7294c6ab461325828276185dff6fed92c54b15ac039c6160d2bac3',
      });

      const apiCall = fixtures.requests.buildSubmittableApiCall({
        sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
      });
      const withdrawal = fixtures.requests.buildWithdrawal({
        sponsorAddress: '0x99bd3a5A045066F1CEf37A0A952DFa87Af9D898E',
      });
      const requests: GroupedRequests = {
        apiCalls: [apiCall],
        withdrawals: [withdrawal],
      };
      const transactionCountsBySponsorAddress = {
        '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181': 79,
        '0x99bd3a5A045066F1CEf37A0A952DFa87Af9D898E': 212,
      };
      const initialState = fixtures.buildEVMProviderState({
        requests,
        transactionCountsBySponsorAddress,
      });

      const state = {
        ...initialState,
        config,
        settings: {
          ...initialState.settings,
          chainOptions: {
            txType,
          },
        },
      };

      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));
      const res = await processTransactions(state);

      expect(txType === '1' ? blockSpy : gasPriceSpy).not.toHaveBeenCalled();
      expect(txType === '2' ? blockSpy : gasPriceSpy).toHaveBeenCalled();
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
      expect(res.gasTarget).toEqual(gasTarget);

      // Withdrawal was submitted
      expect(fulfillWithdrawalMock).toHaveBeenCalledTimes(1);
      expect(fulfillWithdrawalMock).toHaveBeenCalledWith(
        withdrawal.id,
        withdrawal.airnodeAddress,
        withdrawal.sponsorAddress,
        {
          ...gasTarget,
          gasLimit: ethers.BigNumber.from(70_000),
          nonce: 212,
          // example: balance of 250_000_000 - ((50_000 + 20_000) * 1000)
          value: balance.sub(
            ethers.BigNumber.from(50_000)
              .add(ethers.BigNumber.from(20_000))
              .mul(gasTarget.gasPrice ? gasTarget.gasPrice : gasTarget.maxFeePerGas!)
          ),
        }
      );

      // API call was submitted
      expect(fulfillMock).toHaveBeenCalledTimes(1);
      expect(fulfillMock).toHaveBeenCalledWith(
        apiCall.id,
        apiCall.airnodeAddress,
        apiCall.fulfillAddress,
        apiCall.fulfillFunctionId,
        '0x000000000000000000000000000000000000000000000000000000000001252b',
        '0x34c1f1547c1f2f7c3a8bd893e20444ccee56622d37a18b7dc461fb2359ef044e3b63c21e18a93354569207c7d21d1f92f8e8a310a78eeb9a57c455052695491f1b',
        { gasLimit: 500_000, ...gasTarget, nonce: 79 }
      );
    }
  );

  test.each(['1', '2'] as const)(
    `does not submit transactions if a gas price cannot be fetched - txType: %d`,
    async (txType) => {
      const contract = new ethers.Contract('address', ['ABI']);
      const fulfillMock = jest.spyOn(contract, 'fulfill');
      const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
      const blockSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBlock');
      if (txType === '1') {
        gasPriceSpy.mockRejectedValue(new Error('Gas price cannot be fetched'));
      } else {
        blockSpy.mockRejectedValue(new Error('Block header cannot be fetched'));
      }

      const apiCall = fixtures.requests.buildSubmittableApiCall({
        sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
      });
      const requests: GroupedRequests = {
        apiCalls: [apiCall],
        withdrawals: [],
      };
      const transactionCountsBySponsorAddress = { '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181': 79 };
      const initialState = fixtures.buildEVMProviderState({
        requests,
        transactionCountsBySponsorAddress,
      });

      const options = { txType };

      const state = {
        ...initialState,
        settings: {
          ...initialState.settings,
          options,
        },
      };

      const res = await processTransactions(state);

      expect(res.requests.apiCalls[0]).toEqual({ ...apiCall, nonce: 79 });
      expect(res.gasTarget).toEqual(null);

      // API call was NOT submitted
      expect(fulfillMock).not.toHaveBeenCalled();
    }
  );
});
