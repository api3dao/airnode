const getNetworkMock = jest.fn();

jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ethers: {
      ...original,
      providers: {
        JsonRpcProvider: jest.fn().mockImplementation(() => ({
          getNetwork: getNetworkMock,
        })),
      },
    },
  };
});

import { ethers } from 'ethers';
import * as state from './state';

describe('initialize', () => {
  it('sets the initial state', async () => {
    const provider = new ethers.providers.JsonRpcProvider();

    const network: ethers.providers.Network = {
      chainId: 3,
      name: 'ropsten',
    };

    const getNetwork = provider.getNetwork as jest.Mock;
    getNetwork.mockResolvedValueOnce(network);

    const res = await state.initialize();
    expect(res).toEqual({
      chainId: 3,
      currentBlock: null,
      gasPrice: null,
      provider: provider,
    });
  });
});
