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

describe('create', () => {
  it('returns a clean state', () => {
    const provider = new ethers.providers.JsonRpcProvider();

    const config: ProviderConfig = {
      chainId: 3,
      name: 'infura-ropsten',
      url: 'https://ropsten.infura.io/v3/<my-key>',
    };

    const res = state.create(config, 0);
    expect(res).toEqual({
      config,
      currentBlock: null,
      gasPrice: null,
      index: 0,
      provider,
      walletDataByIndex: {},
    });
  });
});

describe('update', () => {
  it('updates the state', () => {
    const config: ProviderConfig = {
      chainId: 3,
      name: 'infura-ropsten',
      url: 'https://ropsten.infura.io/v3/<my-key>',
    };
    const newState = state.create(config, 0);
    const res = state.update(newState, { currentBlock: 123 });
    expect(res.currentBlock).toEqual(123);
  });
});
