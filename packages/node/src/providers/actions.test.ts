import { mockEthers } from '../../test/mock-utils';
const getAirnodeParametersAndBlockNumberMock = jest.fn();
const estimateGasWithdrawalMock = jest.fn();
const failMock = jest.fn();
const fulfillMock = jest.fn();
const fulfillWithdrawalMock = jest.fn();
const staticFulfillMock = jest.fn();
mockEthers({
  airnodeRrpMocks: {
    getAirnodeParametersAndBlockNumber: getAirnodeParametersAndBlockNumberMock,
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

const spawnAwsMock = jest.fn();
jest.mock('../workers/cloud-platforms/aws', () => ({
  spawn: spawnAwsMock,
}));

jest.mock('fs');

import fs from 'fs';
import { ethers } from 'ethers';
import * as providers from './actions';
import * as fixtures from '../../test/fixtures';
import { ChainConfig, GroupedRequests, RequestStatus } from '../types';

const chainProviderName1 = 'Pocket Ethereum Mainnet';
const chainProviderName3 = 'Infura Ropsten';
const chains: ChainConfig[] = [
  {
    airnodeAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
    authorizers: [ethers.constants.AddressZero],
    contracts: {
      AirnodeRrp: '0x197F3826040dF832481f835652c290aC7c41f073',
    },
    id: '1',
    providers: {
      [chainProviderName1]: {
        url: 'https://eth-mainnet.gateway.pokt.network/v1/lb/<app_id>',
      },
    },
    type: 'evm',
  },
  {
    airnodeAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
    authorizers: [ethers.constants.AddressZero],
    contracts: {
      AirnodeRrp: '0x9AF16dE521f41B0e0E70A4f26F9E0C73D757Bd81',
    },
    id: '3',
    providers: {
      [chainProviderName3]: {
        url: 'https://ropsten.infura.io/v3/<key>',
      },
    },
    type: 'evm',
  },
];

describe('initialize', () => {
  it('sets the initial state for each provider', async () => {
    const config = fixtures.buildConfig({ chains });
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));
    const contract = new ethers.Contract('address', ['ABI']);
    contract.getAirnodeParametersAndBlockNumber.mockResolvedValueOnce({
      admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      authorizers: [ethers.constants.AddressZero],
      blockNumber: ethers.BigNumber.from(123456),
      xpub: 'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
    });
    contract.getAirnodeParametersAndBlockNumber.mockResolvedValueOnce({
      admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      authorizers: [ethers.constants.AddressZero],
      blockNumber: ethers.BigNumber.from(987654),
      xpub: 'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
    });
    const getLogs = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
    getLogs.mockResolvedValueOnce([]);
    getLogs.mockResolvedValueOnce([]);
    const workerOpts = fixtures.buildWorkerOptions();
    const [logs, res] = await providers.initialize('abcdefg', config, workerOpts);
    expect(logs).toEqual([]);
    expect(res).toEqual({
      evm: [
        {
          config,
          contracts: {
            AirnodeRrp: '0x197F3826040dF832481f835652c290aC7c41f073',
          },
          settings: {
            airnodeAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
            airnodeId: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
            airnodeIdShort: '19255a4',
            authorizers: [ethers.constants.AddressZero],
            blockHistoryLimit: 300,
            chainId: '1',
            chainType: 'evm',
            ignoreBlockedRequestsAfterBlocks: 20,
            logFormat: 'plain',
            logLevel: 'DEBUG',
            minConfirmations: 0,
            name: 'Pocket Ethereum Mainnet',
            region: 'us-east-1',
            stage: 'test',
            url: 'https://eth-mainnet.gateway.pokt.network/v1/lb/<app_id>',
            xpub: 'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
          },
          coordinatorId: 'abcdefg',
          currentBlock: 123456,
          gasPrice: null,
          id: expect.anything(),
          masterHDNode: expect.any(ethers.utils.HDNode),
          provider: expect.any(ethers.providers.JsonRpcProvider),
          requests: {
            apiCalls: [],
            withdrawals: [],
          },
          transactionCountsByRequesterIndex: {},
        },
        {
          config,
          contracts: {
            AirnodeRrp: '0x9AF16dE521f41B0e0E70A4f26F9E0C73D757Bd81',
          },
          settings: {
            airnodeAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
            airnodeId: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
            airnodeIdShort: '19255a4',
            authorizers: [ethers.constants.AddressZero],
            blockHistoryLimit: 300,
            chainId: '3',
            chainType: 'evm',
            ignoreBlockedRequestsAfterBlocks: 20,
            logFormat: 'plain',
            logLevel: 'DEBUG',
            minConfirmations: 0,
            name: 'Infura Ropsten',
            region: 'us-east-1',
            stage: 'test',
            url: 'https://ropsten.infura.io/v3/<key>',
            xpub: 'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
          },
          coordinatorId: 'abcdefg',
          currentBlock: 987654,
          gasPrice: null,
          id: expect.anything(),
          masterHDNode: expect.any(ethers.utils.HDNode),
          provider: expect.any(ethers.providers.JsonRpcProvider),
          requests: {
            apiCalls: [],
            withdrawals: [],
          },
          transactionCountsByRequesterIndex: {},
        },
      ],
    });
  });

  it('throws an error if no providers are configured', async () => {
    const config = fixtures.buildConfig({ chains: [] });
    const workerOpts = fixtures.buildWorkerOptions();
    await expect(providers.initialize('abcdefg', config, workerOpts)).rejects.toThrow(
      new Error('One or more chains must be defined in the provided config')
    );
  });
});

describe('processRequests', () => {
  it('processes requests for each EVM providers', async () => {
    const gasPrice = ethers.BigNumber.from(1000);
    const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
    gasPriceSpy.mockResolvedValue(gasPrice);

    estimateGasWithdrawalMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
    staticFulfillMock.mockResolvedValue({ callSuccess: true });
    fulfillMock.mockResolvedValue({
      hash: '0xad33fe94de7294c6ab461325828276185dff6fed92c54b15ac039c6160d2bac3',
    });

    const apiCall = fixtures.requests.buildApiCall({ responseValue: '0x123' });
    const requests: GroupedRequests = { apiCalls: [apiCall], withdrawals: [] };

    const transactionCountsByRequesterIndex = { [apiCall.requesterIndex]: 5 };
    const provider0 = fixtures.buildEVMProviderState({ requests, transactionCountsByRequesterIndex });
    const provider1 = fixtures.buildEVMProviderState({ requests, transactionCountsByRequesterIndex });

    const allProviders = { evm: [provider0, provider1] };
    const workerOpts = fixtures.buildWorkerOptions();
    const [logs, res] = await providers.processRequests(allProviders, workerOpts);
    expect(logs).toEqual([]);
    expect(res.evm[0].requests.apiCalls[0]).toEqual({
      ...apiCall,
      fulfillment: { hash: '0xad33fe94de7294c6ab461325828276185dff6fed92c54b15ac039c6160d2bac3' },
      nonce: 5,
      status: RequestStatus.Submitted,
    });
    expect(res.evm[1].requests.apiCalls[0]).toEqual({
      ...apiCall,
      fulfillment: { hash: '0xad33fe94de7294c6ab461325828276185dff6fed92c54b15ac039c6160d2bac3' },
      nonce: 5,
      status: RequestStatus.Submitted,
    });
  });
});
