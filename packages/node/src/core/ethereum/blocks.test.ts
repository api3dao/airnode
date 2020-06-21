const getBlockNumberMock = jest.fn();

jest.mock('ethers', () => {
  return {
    ethers: {
      providers: {
        JsonRpcProvider: jest.fn().mockImplementation(() => ({
          getBlockNumber: getBlockNumberMock,
        })),
      },
    },
  };
});

import { ethers } from 'ethers';
import { State } from '../state';
import * as blocks from './blocks';

describe('getBlockNumber', () => {
  const state: State = {
    chainId: 3,
    provider: new ethers.providers.JsonRpcProvider(),
    gasPrice: null,
  };

  it('returns the block number', async () => {
    const getCurrentBlockNumber = state.provider.getBlockNumber as jest.Mock;
    getCurrentBlockNumber.mockResolvedValueOnce(10308700);

    const res = await blocks.getCurrentBlockNumber(state);
    expect(res).toEqual(10308700);
  });
});
