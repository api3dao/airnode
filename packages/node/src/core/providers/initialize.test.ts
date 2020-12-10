const getProviderAndBlockNumberMock = jest.fn();
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ethers: {
      ...original,
      Contract: jest.fn().mockImplementation(() => ({
        getProviderAndBlockNumber: getProviderAndBlockNumberMock,
      })),
    },
  };
});

const spawnAwsMock = jest.fn();
jest.mock('../workers/cloud-platforms/aws', () => ({
  spawn: spawnAwsMock,
}));

jest.mock('fs');

const chains: ChainConfig[] = [
  {
    providerAdminForRecordCreation: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
    contracts: {
      Airnode: '0x197F3826040dF832481f835652c290aC7c41f073',
      Convenience: '0x2393737d287c555d148012270Ce4567ABb1ee95C',
    },
    id: 1,
    type: 'evm',
    providers: [{ name: 'infura-mainnet', url: 'https://mainnet.infura.io/v3/<key>' }],
  },
  {
    providerAdminForRecordCreation: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
    contracts: {
      Airnode: '0x9AF16dE521f41B0e0E70A4f26F9E0C73D757Bd81',
      Convenience: '0xa8025cA7d22825a663abdCf2a504a33c8F17C41a',
    },
    id: 3,
    type: 'evm',
    providers: [{ name: 'infura-ropsten', url: 'https://ropsten.infura.io/v3/<key>' }],
  },
];

import { ethers } from 'ethers';
import fs from 'fs';
import * as fixtures from 'test/fixtures';
import { ChainConfig } from 'src/types';
import * as providers from './initialize';

describe('initializeProviders', () => {
  it('sets the initial state for each provider', async () => {
    const nodeSettings = fixtures.buildNodeSettings({ chains });
    const config = fixtures.buildConfig({ nodeSettings });
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));
    const contract = new ethers.Contract('address', ['ABI']);
    contract.getProviderAndBlockNumber.mockResolvedValueOnce({
      admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      blockNumber: ethers.BigNumber.from(123456),
      xpub: '0xxpub1',
    });
    contract.getProviderAndBlockNumber.mockResolvedValueOnce({
      admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      blockNumber: ethers.BigNumber.from(987654),
      xpub: '0xxpub2',
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
          Airnode: '0x197F3826040dF832481f835652c290aC7c41f073',
          Convenience: '0x2393737d287c555d148012270Ce4567ABb1ee95C',
        },
        settings: {
          providerAdminForRecordCreation: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
          blockHistoryLimit: 600,
          chainId: 1,
          chainType: 'evm',
          ignoreBlockedRequestsAfterBlocks: 20,
          logFormat: 'plain',
          minConfirmations: 0,
          name: 'infura-mainnet',
          providerId: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
          providerIdShort: '19255a4',
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
          Airnode: '0x9AF16dE521f41B0e0E70A4f26F9E0C73D757Bd81',
          Convenience: '0xa8025cA7d22825a663abdCf2a504a33c8F17C41a',
        },
        settings: {
          providerAdminForRecordCreation: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
          blockHistoryLimit: 600,
          chainId: 3,
          chainType: 'evm',
          ignoreBlockedRequestsAfterBlocks: 20,
          logFormat: 'plain',
          minConfirmations: 0,
          name: 'infura-ropsten',
          providerId: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
          providerIdShort: '19255a4',
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
    const nodeSettings = fixtures.buildNodeSettings({ chains: [] });
    const config = fixtures.buildConfig({ nodeSettings });
    const workerOpts = fixtures.buildWorkerOptions();
    try {
      await providers.initialize('abcdefg', config, workerOpts);
    } catch (e) {
      expect(e).toEqual(new Error('One or more chains must be defined in the provided config'));
    }
  });
});
