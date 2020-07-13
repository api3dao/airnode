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
import { ProviderConfig } from '../../types';
import * as providers from './providers';

describe('initializeProviderState', () => {
  it('sets the initial state', async () => {
    const provider = new ethers.providers.JsonRpcProvider();

    const ropsten: ethers.providers.Network = {
      chainId: 3,
      name: 'ropsten',
    };

    const getNetwork = provider.getNetwork as jest.Mock;
    getNetwork.mockResolvedValueOnce(ropsten);

    const getBlockNumber = provider.getBlockNumber as jest.Mock;
    getBlockNumber.mockResolvedValueOnce(123456);

    const config: ProviderConfig = {
      name: 'infura-ropsten',
      url: 'https://ropsten.infura.io/v3/<my-key>',
    };

    const res = await providers.initializeProviderState(config);
    expect(res).toEqual({
      config,
      currentBlock: 123456,
      gasPrice: null,
      network: ropsten,
      provider,
      requests: [],
    });
  });
});
