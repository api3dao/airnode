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

const chains: ChainConfig[] = [
  {
    adminAddressForCreatingProviderRecord: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
    contracts: {
      Airnode: '0x197F3826040dF832481f835652c290aC7c41f073',
      Convenience: '0x2393737d287c555d148012270Ce4567ABb1ee95C',
    },
    id: 1,
    type: 'evm',
    providers: [{ name: 'infura-mainnet', url: 'https://mainnet.infura.io/v3/<key>' }],
  },
  {
    adminAddressForCreatingProviderRecord: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
    contracts: {
      Airnode: '0x32D228B5d44Fd18FefBfd68BfE5A5F3f75C873AE',
      Convenience: '0xd029Ec5D9184Ecd8E853dC9642bdC1E0766266A1',
    },
    id: 3,
    type: 'evm',
    providers: [{ name: 'infura-ropsten', url: 'https://ropsten.infura.io/v3/<key>' }],
  },
];

import { ethers } from 'ethers';
import * as fixtures from 'test/fixtures';
import { ChainConfig } from 'src/types';
import * as providers from './initialize';

describe('initializeProviders', () => {
  it('sets the initial state for each provider', async () => {
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

    const nodeSettings = fixtures.buildNodeSettings({ chains });
    const config = fixtures.buildConfig({ nodeSettings });
    const workerOpts = fixtures.buildWorkerOptions();
    const res = await providers.initialize('abcdefg', config, workerOpts);
    expect(res).toEqual([
      {
        contracts: {
          Airnode: '0x197F3826040dF832481f835652c290aC7c41f073',
          Convenience: '0x2393737d287c555d148012270Ce4567ABb1ee95C',
        },
        settings: {
          adminAddressForCreatingProviderRecord: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
          blockHistoryLimit: 600,
          chainId: 1,
          chainType: 'evm',
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
        provider: expect.anything(),
        requests: {
          apiCalls: [],
          withdrawals: [],
        },
        transactionCountsByRequesterIndex: {},
      },
      {
        contracts: {
          Airnode: '0x32D228B5d44Fd18FefBfd68BfE5A5F3f75C873AE',
          Convenience: '0xd029Ec5D9184Ecd8E853dC9642bdC1E0766266A1',
        },
        settings: {
          adminAddressForCreatingProviderRecord: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
          blockHistoryLimit: 600,
          chainId: 3,
          chainType: 'evm',
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
        provider: expect.anything(),
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
