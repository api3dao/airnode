const getBlockNumberMock = jest.fn();
const getLogsMock = jest.fn();
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ethers: {
      ...original,
      providers: {
        JsonRpcProvider: jest.fn().mockImplementation(() => ({
          getBlockNumber: getBlockNumberMock,
          getLogs: getLogsMock,
        })),
      },
    },
  };
});

const ethereumProviders: ProviderConfig[] = [
  { chainId: 3, name: 'infura-ropsten', url: 'https://ropsten.eth' },
  { chainId: 1, name: 'infura-mainnet', url: 'https://mainnet.eth' },
];

jest.mock('../config', () => ({
  config: {
    nodeSettings: {
      cloudProvider: 'local:aws',
      ethereumProviders: ethereumProviders,
    },
  },
}));

import { ethers } from 'ethers';
import { ProviderConfig } from '../../types';
import * as state from './state';

describe('initialize', () => {
  it('sets the initial state for each provider', async () => {
    const provider = new ethers.providers.JsonRpcProvider();

    const getBlockNumber = provider.getBlockNumber as jest.Mock;
    getBlockNumber.mockResolvedValueOnce(123456);
    getBlockNumber.mockResolvedValueOnce(987654);

    const getLogs = provider.getLogs as jest.Mock;
    getLogs.mockResolvedValueOnce([]);
    getLogs.mockResolvedValueOnce([]);

    const res = await state.initialize(ethereumProviders);
    expect(res).toEqual({
      providers: [
        {
          config: ethereumProviders[0],
          currentBlock: 123456,
          gasPrice: null,
          index: 0,
          provider,
          requests: {
            apiCalls: [],
            walletAuthorizations: [],
            withdrawals: [],
          },
        },
        {
          config: ethereumProviders[1],
          currentBlock: 987654,
          gasPrice: null,
          index: 1,
          provider,
          requests: {
            apiCalls: [],
            walletAuthorizations: [],
            withdrawals: [],
          },
        },
      ],
    });
  });

  it('throws an error if no providers are configured', async () => {
    expect.assertions(1);
    try {
      await state.initialize([]);
    } catch (e) {
      expect(e).toEqual(new Error('At least one provider must be defined in config.json'));
    }
  });
});
