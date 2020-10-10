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
import * as fixtures from 'test/fixtures';
import { ChainConfig, ChainProvider } from 'src/types';
import * as state from './state';

describe('create', () => {
  it('returns a clean state with defaults', () => {
    const provider = new ethers.providers.JsonRpcProvider();
    const coordinatorId = '837daEf231';
    const chainProvider: ChainProvider = { name: 'ganache-test', url: 'http://localhost:4111' };
    const chainConfig: ChainConfig = { id: 1337, type: 'evm', providers: [chainProvider] };
    const settings = fixtures.createNodeSettings();

    const res = state.createEVMState(coordinatorId, chainConfig, chainProvider, settings);
    expect(res).toEqual({
      contracts: {
        Airnode: '0xe60b966B798f9a0C41724f111225A5586ff30656',
        Convenience: '0xD5659F26A72A8D718d1955C42B3AE418edB001e0',
        GasPriceFeed: '<TODO>',
      },
      settings: {
        blockHistoryLimit: 600,
        chainId: 1337,
        chainType: 'evm',
        logFormat: 'plain',
        minConfirmations: 6,
        name: 'ganache-test',
        url: 'http://localhost:4111',
      },
      coordinatorId: '837daEf231',
      currentBlock: null,
      gasPrice: null,
      provider,
      walletDataByIndex: {},
    });
  });

  it('allows for overwriting settings', () => {
    const provider = new ethers.providers.JsonRpcProvider();
    const coordinatorId = '837daEf231';
    const chainProvider: ChainProvider = {
      blockHistoryLimit: 150,
      minConfirmations: 3,
      name: 'ganache-test',
      url: 'http://localhost:4111',
    };
    const chainConfig: ChainConfig = { id: 1337, type: 'evm', providers: [chainProvider] };
    const settings = fixtures.createNodeSettings();

    const res = state.createEVMState(coordinatorId, chainConfig, chainProvider, settings);
    expect(res).toEqual({
      contracts: {
        Airnode: '0xe60b966B798f9a0C41724f111225A5586ff30656',
        Convenience: '0xD5659F26A72A8D718d1955C42B3AE418edB001e0',
        GasPriceFeed: '<TODO>',
      },
      settings: {
        blockHistoryLimit: 150,
        chainId: 1337,
        chainType: 'evm',
        logFormat: 'plain',
        minConfirmations: 3,
        name: 'ganache-test',
        url: 'http://localhost:4111',
      },
      coordinatorId: '837daEf231',
      currentBlock: null,
      gasPrice: null,
      provider,
      walletDataByIndex: {},
    });
  });

  it('allows for overwriting contracts', () => {
    const provider = new ethers.providers.JsonRpcProvider();
    const coordinatorId = '837daEf231';
    const chainProvider: ChainProvider = { name: 'ganache-test', url: 'http://localhost:4111' };
    const chainConfig: ChainConfig = {
      id: 1337,
      type: 'evm',
      providers: [chainProvider],
      contracts: [
        { name: 'Airnode', address: '0xB71dE2DA6240c45846ED58315a01dd6D843fD3b5' },
        { name: 'GasPriceFeed', address: '0x5e94fc41d4add01a34616f781dcf1e29e8dc41c1' },
      ],
    };
    const settings = fixtures.createNodeSettings();

    const res = state.createEVMState(coordinatorId, chainConfig, chainProvider, settings);
    expect(res).toEqual({
      contracts: {
        Airnode: '0xB71dE2DA6240c45846ED58315a01dd6D843fD3b5',
        Convenience: '0xD5659F26A72A8D718d1955C42B3AE418edB001e0',
        GasPriceFeed: '0x5e94fc41d4add01a34616f781dcf1e29e8dc41c1',
      },
      settings: {
        blockHistoryLimit: 600,
        chainId: 1337,
        chainType: 'evm',
        logFormat: 'plain',
        minConfirmations: 6,
        name: 'ganache-test',
        url: 'http://localhost:4111',
      },
      coordinatorId: '837daEf231',
      currentBlock: null,
      gasPrice: null,
      provider,
      walletDataByIndex: {},
    });
  });
});

describe('update', () => {
  it('updates the state', () => {
    const newState = fixtures.createEVMProviderState();
    const res = state.update(newState, { currentBlock: 123 });
    expect(res.currentBlock).toEqual(123);
  });
});
