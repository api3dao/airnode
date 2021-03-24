const getAirnodeParametersAndBlockNumberMock = jest.fn();
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ethers: {
      ...original,
      Contract: jest.fn().mockImplementation(() => ({
        getAirnodeParametersAndBlockNumber: getAirnodeParametersAndBlockNumberMock,
      })),
    },
  };
});

const spawnAwsMock = jest.fn();
jest.mock('../workers/cloud-platforms/aws', () => ({
  spawn: spawnAwsMock,
}));

jest.mock('fs');

import { ethers } from 'ethers';
import fs from 'fs';
import * as fixtures from 'test/fixtures';
import { ChainConfig, EnvironmentConfig } from 'src/types';
import * as providers from './initialize';

const chainProviderName1 = 'Infura Mainnet';
const chainProviderName3 = 'Infura Ropsten';
const chains: ChainConfig[] = [
  {
    airnodeAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
    authorizers: [ethers.constants.AddressZero],
    contracts: {
      AirnodeRrp: '0x197F3826040dF832481f835652c290aC7c41f073',
    },
    id: '1',
    providerNames: [chainProviderName1],
    type: 'evm',
  },
  {
    airnodeAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
    authorizers: [ethers.constants.AddressZero],
    contracts: {
      AirnodeRrp: '0x9AF16dE521f41B0e0E70A4f26F9E0C73D757Bd81',
    },
    id: '3',
    providerNames: [chainProviderName3],
    type: 'evm',
  },
];

const environmentConfig: EnvironmentConfig = {
  securitySchemes: [],
  chainProviders: [
    {
      chainType: 'evm',
      chainId: '1',
      name: chainProviderName1,
      envName: 'CP_EVM_1_INFURA_MAINNET',
    },
    {
      chainType: 'evm',
      chainId: '3',
      name: chainProviderName3,
      envName: 'CP_EVM_3_INFURA_ROPSTEN',
    },
  ],
};

describe('initializeProviders', () => {
  it('sets the initial state for each provider', async () => {
    const config = fixtures.buildConfig({ chains, environment: environmentConfig });
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));
    const contract = new ethers.Contract('address', ['ABI']);
    contract.getAirnodeParametersAndBlockNumber.mockResolvedValueOnce({
      admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      authorizers: [ethers.constants.AddressZero],
      blockNumber: ethers.BigNumber.from(123456),
      xpub:
        'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
    });
    contract.getAirnodeParametersAndBlockNumber.mockResolvedValueOnce({
      admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      authorizers: [ethers.constants.AddressZero],
      blockNumber: ethers.BigNumber.from(987654),
      xpub:
        'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
    });
    const getLogs = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
    getLogs.mockResolvedValueOnce([]);
    getLogs.mockResolvedValueOnce([]);
    const workerOpts = fixtures.buildWorkerOptions();
    const [logs, res] = await providers.initialize('abcdefg', config, workerOpts);
    expect(logs).toEqual([]);
    expect(res).toEqual([
      {
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
          name: 'Infura Mainnet',
          region: 'us-east-1',
          stage: 'test',
          url: 'https://mainnet.infura.io/v3/<key>',
          xpub:
            'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
        },
        coordinatorId: 'abcdefg',
        currentBlock: 123456,
        gasPrice: null,
        masterHDNode: expect.any(ethers.utils.HDNode),
        provider: expect.any(ethers.providers.JsonRpcProvider),
        requests: {
          apiCalls: [],
          withdrawals: [],
        },
        transactionCountsByRequesterIndex: {},
      },
      {
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
          xpub:
            'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
        },
        coordinatorId: 'abcdefg',
        currentBlock: 987654,
        gasPrice: null,
        masterHDNode: expect.any(ethers.utils.HDNode),
        provider: expect.any(ethers.providers.JsonRpcProvider),
        requests: {
          apiCalls: [],
          withdrawals: [],
        },
        transactionCountsByRequesterIndex: {},
      },
    ]);
  });

  it('throws an error if no providers are configured', async () => {
    expect.assertions(1);
    const config = fixtures.buildConfig({ chains: [] });
    const workerOpts = fixtures.buildWorkerOptions();
    try {
      await providers.initialize('abcdefg', config, workerOpts);
    } catch (e) {
      expect(e).toEqual(new Error('One or more chains must be defined in the provided config'));
    }
  });
});
