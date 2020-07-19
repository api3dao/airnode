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
import * as state from './state';

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

    const res = await state.initializeState(config, 0);
    expect(res).toEqual({
      config,
      currentBlock: 123456,
      gasPrice: null,
      index: 0,
      provider,
      requests: {
        apiCalls: [],
      },
    });
  });
});
