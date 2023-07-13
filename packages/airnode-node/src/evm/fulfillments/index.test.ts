import { mockEthers } from '../../../test/mock-utils';
const estimateWithdrawalGasMock = jest.fn();
const failMock = jest.fn();
const fulfillMock = jest.fn();
const fulfillWithdrawalMock = jest.fn();
const staticFulfillMock = jest.fn();
const estimateFulfillMock = jest.fn();
mockEthers({
  airnodeRrpMocks: {
    callStatic: {
      fulfill: staticFulfillMock,
    },
    estimateGas: { fulfill: estimateFulfillMock, fulfillWithdrawal: estimateWithdrawalGasMock },
    fail: failMock,
    fulfill: fulfillMock,
    fulfillWithdrawal: fulfillWithdrawalMock,
  },
});

import { ethers } from 'ethers';
import { GasTarget } from '@api3/airnode-utilities';
import * as fixtures from '../../../test/fixtures';
import { EVMProviderSponsorState, GroupedRequests, ProviderState, RequestErrorMessage } from '../../types';
import * as providerState from '../../providers/state';
import * as fulfillments from './index';

describe('submit', () => {
  let mutableInitialState: ProviderState<EVMProviderSponsorState>;
  fixtures.setEnvVariables({ AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey() });

  beforeEach(() => {
    mutableInitialState = fixtures.buildEVMProviderSponsorState();
  });

  it('submits transactions for multiple wallets and returns the transactions', async () => {
    const requests: GroupedRequests = {
      apiCalls: [
        fixtures.requests.buildSuccessfulApiCall({
          id: '0xd211ecb4fbf347cabfb32e25d8485338abc28d54bd4735022ade13854d13cad8', //apiCallId1
          nonce: 10,
          sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
        }),
        fixtures.requests.buildSuccessfulApiCall({
          id: '0x0995770ea47ab31250abed45f091375f4bc16a1713c2b20ba04430865295bde0', //apiCallId2
          nonce: 11,
          sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
        }),
      ],
      withdrawals: [
        fixtures.requests.buildWithdrawal({
          id: '0x6671f6224054806905bbe20cce2f3a8271f5b877bffc480edb9bc71fe616466e', //apiCallId5
          nonce: 3,
          sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
        }),
      ],
    };
    const gasTarget: GasTarget = {
      type: 0,
      gasPrice: ethers.BigNumber.from(1000),
      gasLimit: ethers.BigNumber.from(500_000),
    };
    const provider = new ethers.providers.JsonRpcProvider();
    const state = providerState.update(mutableInitialState, { gasTarget, provider, requests });

    estimateFulfillMock.mockResolvedValue(73804);
    staticFulfillMock.mockResolvedValue({ callSuccess: true });
    fulfillMock.mockResolvedValueOnce({ hash: '0xapicall_tx1' });
    fulfillMock.mockResolvedValueOnce({ hash: '0xapicall_tx2' });
    const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
    balanceSpy.mockResolvedValue(ethers.BigNumber.from(250_000_000));
    estimateWithdrawalGasMock.mockResolvedValue(ethers.BigNumber.from(50_000));
    fulfillWithdrawalMock.mockResolvedValueOnce({ hash: '0xwithdrawal_tx1' });

    const res = await fulfillments.submit(state);
    expect(res.apiCalls.length).toEqual(2);
    expect(res.withdrawals.length).toEqual(1);

    expect(res.apiCalls).toEqual([
      {
        ...requests.apiCalls[0],
        fulfillment: { hash: '0xapicall_tx1' },
      },
      {
        ...requests.apiCalls[1],
        fulfillment: { hash: '0xapicall_tx2' },
      },
    ]);

    expect(res.withdrawals).toEqual([
      {
        ...requests.withdrawals[0],
        fulfillment: { hash: '0xwithdrawal_tx1' },
      },
    ]);
  });

  it('does not submit failed API calls', async () => {
    const apiCall = fixtures.requests.buildApiCall({
      id: '0xd211ecb4fbf347cabfb32e25d8485338abc28d54bd4735022ade13854d13cad8',
      nonce: 5,
      sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
    });
    const requests: GroupedRequests = {
      apiCalls: [apiCall],
      withdrawals: [],
    };
    const gasTarget: GasTarget = { type: 0, gasPrice: ethers.BigNumber.from(1000) };
    const provider = new ethers.providers.JsonRpcProvider();
    const state = providerState.update(mutableInitialState, { gasTarget, provider, requests });

    staticFulfillMock.mockResolvedValue({ callSuccess: true });
    fulfillMock.mockRejectedValueOnce(new Error('Server did not respond'));
    fulfillMock.mockRejectedValueOnce(new Error('Server did not respond'));

    const res = await fulfillments.submit(state);
    expect(res.apiCalls).toEqual([
      {
        ...apiCall,
        errorMessage: `${RequestErrorMessage.FulfillTransactionFailed} with error: Only successful API can be submitted`,
      },
    ]);
  });

  it('does not submit failed withdrawals', async () => {
    const withdrawal = fixtures.requests.buildWithdrawal({
      id: '0x6671f6224054806905bbe20cce2f3a8271f5b877bffc480edb9bc71fe616466e',
      nonce: 3,
      sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
    });
    const requests: GroupedRequests = {
      apiCalls: [],
      withdrawals: [withdrawal],
    };
    const gasTarget: GasTarget = { type: 0, gasPrice: ethers.BigNumber.from(1000) };
    const provider = new ethers.providers.JsonRpcProvider();
    const state = providerState.update(mutableInitialState, { gasTarget, provider, requests });

    const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
    balanceSpy.mockResolvedValue(ethers.BigNumber.from(250_000_000));
    estimateWithdrawalGasMock.mockResolvedValue(ethers.BigNumber.from(50_000));
    fulfillWithdrawalMock.mockRejectedValueOnce(new Error('Server did not respond'));
    fulfillWithdrawalMock.mockRejectedValueOnce(new Error('Server did not respond'));

    const res = await fulfillments.submit(state);
    expect(res.withdrawals).toEqual([withdrawal]);
  });
});
