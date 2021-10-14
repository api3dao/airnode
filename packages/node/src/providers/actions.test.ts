import { mockEthers } from '../../test/mock-utils';
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
    const getBlockNumber = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBlockNumber');
    getBlockNumber.mockResolvedValueOnce(123456);
    getBlockNumber.mockResolvedValueOnce(987654);
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
            airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
            airnodeAddressShort: 'a30ca71',
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
            xpub: 'xpub6C8tvRgYkjNVaGMtpyZf4deBcUQHf7vgWUraVxY6gYiZhBYbPkFkLLWJzUUeVFdkKpVtatmXHX8kB76xgfmTpVZWbVWdq1rneaAY6a8RtbY',
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
          transactionCountsBySponsorAddress: {},
        },
        {
          config,
          contracts: {
            AirnodeRrp: '0x9AF16dE521f41B0e0E70A4f26F9E0C73D757Bd81',
          },
          settings: {
            airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
            airnodeAddressShort: 'a30ca71',
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
            xpub: 'xpub6C8tvRgYkjNVaGMtpyZf4deBcUQHf7vgWUraVxY6gYiZhBYbPkFkLLWJzUUeVFdkKpVtatmXHX8kB76xgfmTpVZWbVWdq1rneaAY6a8RtbY',
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
          transactionCountsBySponsorAddress: {},
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

    const sponsorAddress = '0x641eeb15B15d8E2CFB5f9d6480B175d93c14e6B6';
    const apiCall = fixtures.requests.buildApiCall({
      id: '0x67caaa2862cf971502d5c5b3d94d09d15c770f3313e76aa95c296b6587e7e5f1',
      responseValue: '0x448b8ad3a330cf8f269f487881b59efff721b3dfa8e61f7c8fd2480389459ed3',
      sponsorAddress,
    });
    const requests: GroupedRequests = { apiCalls: [apiCall], withdrawals: [] };

    const transactionCountsBySponsorAddress = { [sponsorAddress]: 5 };
    const provider0 = fixtures.buildEVMProviderState({ requests, transactionCountsBySponsorAddress });
    const provider1 = fixtures.buildEVMProviderState({ requests, transactionCountsBySponsorAddress });

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
