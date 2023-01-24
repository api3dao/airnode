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

import { GasTarget } from '@api3/airnode-utilities';
import { BigNumber, ethers } from 'ethers';
import { processTransactions } from './process-transactions';
import * as fixtures from '../../../test/fixtures';
import { GroupedRequests, ProviderState, EVMProviderSponsorState } from '../../types';

const createConfig = () => {
  const initialConfig = fixtures.buildConfig();
  return {
    ...initialConfig,
    chains: initialConfig.chains.map((chain) => ({
      ...chain,
      options: {
        fulfillmentGasLimit: 500_000,
        gasPriceOracle: [
          {
            gasPriceStrategy: 'constantGasPrice',
            gasPrice: {
              value: 10,
              unit: 'gwei',
            },
          },
        ],
      },
    })),
  };
};

describe('processTransactions', () => {
  fixtures.setEnvVariables({ AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey() });

  test.each(['legacy', 'eip1559'] as const)(
    'fetches the gas price, assigns nonces and submits transactions - txType: %s',
    async (txType) => {
      const config = createConfig();
      const { gasTarget: gasTargetMock, blockWithTransactionsSpy } = createAndMockGasTarget(txType);
      // Set gasTarget to type 0 since only providerRecommendedEip1559GasPriceStrategy returns type 2 values
      const gasTarget =
        txType === 'eip1559'
          ? { type: 0, gasPrice: gasTargetMock.maxFeePerGas!, gasLimit: gasTargetMock.gasLimit }
          : gasTargetMock;

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

      const apiCall = fixtures.requests.buildSuccessfulApiCall({
        sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
      });
      const withdrawal = fixtures.requests.buildWithdrawal({
        sponsorAddress: '0x99bd3a5A045066F1CEf37A0A952DFa87Af9D898E',
        sponsorWalletAddress: '0xE3C02B8866369AeFDEAce3Bd149E187fC2F5b8E6',
      });

      const transactionCountsBySponsorAddress = {
        '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181': 79,
        '0x99bd3a5A045066F1CEf37A0A952DFa87Af9D898E': 212,
      };

      // Transactions for sponsor address 0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181
      let requests: GroupedRequests = {
        apiCalls: [apiCall],
        withdrawals: [],
      };

      let initialState = fixtures.buildEVMProviderSponsorState({
        requests,
        transactionCountsBySponsorAddress,
        sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
      });

      let state = {
        ...initialState,
        config,
        settings: {
          ...initialState.settings,
          chainOptions: {
            ...initialState.settings.chainOptions,
            fulfillmentGasLimit: 500_000,
          },
        },
      } as ProviderState<EVMProviderSponsorState>;

      let res = await processTransactions(state);

      expect(blockWithTransactionsSpy).toHaveBeenCalled();
      expect(res.requests.apiCalls[0]).toEqual({
        ...apiCall,
        nonce: 79,
        fulfillment: { hash: '0xad33fe94de7294c6ab461325828276185dff6fed92c54b15ac039c6160d2bac3' },
      });

      // API call was submitted
      expect(fulfillMock).toHaveBeenCalledTimes(1);
      expect(fulfillMock).toHaveBeenCalledWith(
        apiCall.id,
        apiCall.airnodeAddress,
        apiCall.fulfillAddress,
        apiCall.fulfillFunctionId,
        '0x000000000000000000000000000000000000000000000000000000000001252b',
        '0x34c1f1547c1f2f7c3a8bd893e20444ccee56622d37a18b7dc461fb2359ef044e3b63c21e18a93354569207c7d21d1f92f8e8a310a78eeb9a57c455052695491f1b',
        { ...gasTarget, nonce: 79 }
      );

      // Transactions for sponsor address 0x99bd3a5A045066F1CEf37A0A952DFa87Af9D898E
      requests = {
        apiCalls: [],
        withdrawals: [withdrawal],
      };

      initialState = fixtures.buildEVMProviderSponsorState({
        requests,
        transactionCountsBySponsorAddress,
        sponsorAddress: '0x99bd3a5A045066F1CEf37A0A952DFa87Af9D898E',
      });

      state = {
        ...initialState,
        config,
        settings: {
          ...initialState.settings,
          chainOptions: {
            ...initialState.settings.chainOptions,
            fulfillmentGasLimit: 500_000,
          },
        },
      } as ProviderState<EVMProviderSponsorState>;

      res = await processTransactions(state);

      expect(res.requests.withdrawals[0]).toEqual({
        ...withdrawal,
        nonce: 212,
        fulfillment: { hash: '0xcbb3f9dc6a24e8b6f5427dcf960b1da01c3df0636cb25a292f8dcaad78755c8d' },
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
          value: balance.sub(ethers.BigNumber.from(50_000).add(ethers.BigNumber.from(20_000)).mul(gasTarget.gasPrice!)),
        }
      );
    }
  );

  it('overrides gas price with a request specifying _gasPrice reserved parameter', async () => {
    // _gasPrice is included in reservedParameters via buildOIS()
    const config = createConfig();
    const { gasTarget, blockWithTransactionsSpy } = createAndMockGasTarget('eip1559');

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

    // Requester specifies desired gas price via the _gasPrice parameter
    const requestedGasPrice = '1000000000'; // 1 gwei in wei
    const apiCall = {
      ...fixtures.requests.buildSuccessfulApiCall({
        sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
        reservedParameterOverrides: {
          gasPrice: requestedGasPrice,
        },
      }),
      parameters: { from: 'ETH', _gasPrice: requestedGasPrice },
    };

    const transactionCountsBySponsorAddress = {
      '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181': 79,
      '0x99bd3a5A045066F1CEf37A0A952DFa87Af9D898E': 212,
    };

    const requests: GroupedRequests = {
      apiCalls: [apiCall],
      withdrawals: [],
    };

    const initialState = fixtures.buildEVMProviderSponsorState({
      requests,
      transactionCountsBySponsorAddress,
      sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
    });

    const state = {
      ...initialState,
      config,
      settings: {
        ...initialState.settings,
        chainOptions: {
          ...initialState.settings.chainOptions,
          fulfillmentGasLimit: 500_000,
        },
      },
    } as ProviderState<EVMProviderSponsorState>;

    const res = await processTransactions(state);

    expect(blockWithTransactionsSpy).toHaveBeenCalled();
    expect(res.requests.apiCalls[0]).toEqual({
      ...apiCall,
      nonce: 79,
      fulfillment: { hash: '0xad33fe94de7294c6ab461325828276185dff6fed92c54b15ac039c6160d2bac3' },
    });

    // expect gasTarget to have been overwritten with the requested gas price
    const expectedGasTarget: GasTarget = {
      type: 0,
      gasLimit: gasTarget.gasLimit,
      gasPrice: BigNumber.from(requestedGasPrice),
    };

    // API call was submitted
    expect(fulfillMock).toHaveBeenCalledTimes(1);
    expect(fulfillMock).toHaveBeenCalledWith(
      apiCall.id,
      apiCall.airnodeAddress,
      apiCall.fulfillAddress,
      apiCall.fulfillFunctionId,
      '0x000000000000000000000000000000000000000000000000000000000001252b',
      '0x34c1f1547c1f2f7c3a8bd893e20444ccee56622d37a18b7dc461fb2359ef044e3b63c21e18a93354569207c7d21d1f92f8e8a310a78eeb9a57c455052695491f1b',
      { ...expectedGasTarget, nonce: 79 }
    );
  });
});
