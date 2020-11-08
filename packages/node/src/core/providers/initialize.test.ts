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
    id: 1,
    type: 'evm',
    providers: [{ name: 'infura-mainnet', url: 'https://mainnet.infura.io/v3/<key>' }],
  },
  {
    adminAddressForCreatingProviderRecord: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
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

    const coordinatorId = '837daEf231';
    const config = fixtures.buildConfig();
    const res = await providers.initialize(coordinatorId, chains, config);
    expect(res).toEqual([
      {
        contracts: {
          Airnode: '<TODO>',
          Convenience: '<TODO>',
        },
        settings: {
          adminAddressForCreatingProviderRecord: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
          blockHistoryLimit: 600,
          chainId: 1,
          chainType: 'evm',
          logFormat: 'plain',
          minConfirmations: 6,
          name: 'infura-mainnet',
          providerId: '0xf5ad700af68118777f79fd1d1c8568f7377d4ae9e9ccce5970fe63bc7a1c1d6d',
          url: 'https://mainnet.infura.io/v3/<key>',
        },
        config,
        coordinatorId,
        currentBlock: 123456,
        gasPrice: null,
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
          minConfirmations: 6,
          name: 'infura-ropsten',
          providerId: '0xf5ad700af68118777f79fd1d1c8568f7377d4ae9e9ccce5970fe63bc7a1c1d6d',
          url: 'https://ropsten.infura.io/v3/<key>',
        },
        config,
        coordinatorId,
        currentBlock: 987654,
        gasPrice: null,
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
    const coordinatorId = '837daEf231';
    const config = fixtures.buildConfig();
    try {
      await providers.initialize(coordinatorId, [], config);
    } catch (e) {
      expect(e).toEqual(new Error('One or more chains must be defined in config.json'));
    }
  });
});
