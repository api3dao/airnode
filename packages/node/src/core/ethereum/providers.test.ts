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
import { ProviderConfig } from '../../types';
import * as providers from './providers';

describe('initializeProviderState', () => {
  it('sets the initial state', async () => {
    const provider = new ethers.providers.JsonRpcProvider();

    const getBlockNumber = provider.getBlockNumber as jest.Mock;
    getBlockNumber.mockResolvedValueOnce(123456);

    const config: ProviderConfig = {
      chainId: 3,
      name: 'infura-ropsten',
      url: 'https://ropsten.infura.io/v3/<my-key>',
    };

    const res = await providers.initializeProviderState(config);
    expect(res).toEqual({
      config,
      currentBlock: 123456,
      gasPrice: null,
      nonce: null,
      provider,
      requests: [],
    });
  });
});
