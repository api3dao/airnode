const getBlockNumberMock = jest.fn();
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ethers: {
      ...original,
      providers: {
        JsonRpcProvider: jest.fn().mockImplementation(() => ({
          getBlockNumber: getBlockNumberMock,
        })),
      },
    },
  };
});

import { ethers } from 'ethers';
import { ProviderConfig } from '../types';
import * as state from './state';

describe('initialize', () => {
  it('sets the initial state for each provider', async () => {
    const provider = new ethers.providers.JsonRpcProvider();

    const getBlockNumber = provider.getBlockNumber as jest.Mock;
    getBlockNumber.mockResolvedValueOnce(123456);
    getBlockNumber.mockResolvedValueOnce(987654);

    const providerConfigs: ProviderConfig[] = [
      {
        chainId: 3,
        name: 'infura-ropsten',
        url: 'https://ropsten.infura.io/v3/<my-key>',
      },
      {
        chainId: 1,
        name: 'infura-mainnet',
        url: 'https://mainnet.infura.io/v3/<my-key>',
      },
    ];

    const res = await state.initialize(providerConfigs);
    expect(res).toEqual({
      providers: [
        {
          config: providerConfigs[0],
          currentBlock: 123456,
          gasPrice: null,
          nonce: null,
          provider,
          requests: {
            apiCalls: [],
          },
        },
        {
          config: providerConfigs[1],
          currentBlock: 987654,
          gasPrice: null,
          nonce: null,
          provider,
          requests: {
            apiCalls: [],
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
