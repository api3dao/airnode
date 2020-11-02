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
    const chainConfig: ChainConfig = {
      adminAddressForCreatingProviderRecord: '0xadminAddressForCreatingProviderRecord',
      id: 1337,
      type: 'evm',
      providers: [chainProvider],
    };
    const settings = fixtures.createNodeSettings();

    const res = state.createEVMState(coordinatorId, chainConfig, chainProvider, settings);
    expect(res).toEqual({
      contracts: {
        Airnode: '0x197F3826040dF832481f835652c290aC7c41f073',
        Convenience: '0x2393737d287c555d148012270Ce4567ABb1ee95C',
        GasPriceFeed: '<TODO>',
      },
      settings: {
        adminAddressForCreatingProviderRecord: '0xadminAddressForCreatingProviderRecord',
        blockHistoryLimit: 600,
        chainId: 1337,
        chainType: 'evm',
        logFormat: 'plain',
        minConfirmations: 6,
        name: 'ganache-test',
        providerId: '0xf5ad700af68118777f79fd1d1c8568f7377d4ae9e9ccce5970fe63bc7a1c1d6d',
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
    const chainConfig: ChainConfig = {
      adminAddressForCreatingProviderRecord: '0xadminAddressForCreatingProviderRecord',
      id: 1337,
      type: 'evm',
      providers: [chainProvider],
    };
    const settings = fixtures.createNodeSettings();

    const res = state.createEVMState(coordinatorId, chainConfig, chainProvider, settings);
    expect(res).toEqual({
      contracts: {
        Airnode: '0x197F3826040dF832481f835652c290aC7c41f073',
        Convenience: '0x2393737d287c555d148012270Ce4567ABb1ee95C',
        GasPriceFeed: '<TODO>',
      },
      settings: {
        adminAddressForCreatingProviderRecord: '0xadminAddressForCreatingProviderRecord',
        blockHistoryLimit: 150,
        chainId: 1337,
        chainType: 'evm',
        logFormat: 'plain',
        minConfirmations: 3,
        name: 'ganache-test',
        providerId: '0xf5ad700af68118777f79fd1d1c8568f7377d4ae9e9ccce5970fe63bc7a1c1d6d',
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
      adminAddressForCreatingProviderRecord: '0xadminAddressForCreatingProviderRecord',
      id: 1337,
      type: 'evm',
      providers: [chainProvider],
      contracts: [
        { name: 'Airnode', address: '0xe60b966B798f9a0C41724f111225A5586ff30656' },
        { name: 'GasPriceFeed', address: '0x5e94fc41d4add01a34616f781dcf1e29e8dc41c1' },
      ],
    };
    const settings = fixtures.createNodeSettings();

    const res = state.createEVMState(coordinatorId, chainConfig, chainProvider, settings);
    expect(res).toEqual({
      contracts: {
        Airnode: '0xe60b966B798f9a0C41724f111225A5586ff30656',
        Convenience: '0x2393737d287c555d148012270Ce4567ABb1ee95C',
        GasPriceFeed: '0x5e94fc41d4add01a34616f781dcf1e29e8dc41c1',
      },
      settings: {
        adminAddressForCreatingProviderRecord: '0xadminAddressForCreatingProviderRecord',
        blockHistoryLimit: 600,
        chainId: 1337,
        chainType: 'evm',
        logFormat: 'plain',
        minConfirmations: 6,
        name: 'ganache-test',
        providerId: '0xf5ad700af68118777f79fd1d1c8568f7377d4ae9e9ccce5970fe63bc7a1c1d6d',
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
