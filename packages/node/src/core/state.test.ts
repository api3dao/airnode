const getNetworkMock = jest.fn();
const getBlockNumberMock = jest.fn();
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ethers: {
      ...original,
      providers: {
        JsonRpcProvider: jest.fn().mockImplementation(() => ({
          getNetwork: getNetworkMock,
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

    const ropsten: ethers.providers.Network = { chainId: 3, name: 'ropsten' };
    const mainnet: ethers.providers.Network = { chainId: 1, name: 'mainnet' };

    const getNetwork = provider.getNetwork as jest.Mock;
    getNetwork.mockResolvedValueOnce(ropsten);
    getNetwork.mockResolvedValueOnce(mainnet);

    const getBlockNumber = provider.getBlockNumber as jest.Mock;
    getBlockNumber.mockResolvedValueOnce(123456);
    getBlockNumber.mockResolvedValueOnce(987654);

    const providerConfigs: ProviderConfig[] = [
      {
        name: 'infura-ropsten',
        url: 'https://ropsten.infura.io/v3/<my-key>',
      },
      {
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
          network: ropsten,
          provider,
          requests: [],
        },
        {
          config: providerConfigs[1],
          currentBlock: 987654,
          gasPrice: null,
          network: mainnet,
          provider,
          requests: [],
        },
      ]
    });
  });
});
