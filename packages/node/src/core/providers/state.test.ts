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
    const config = fixtures.buildConfig();
    const res = state.buildEVMState(coordinatorId, chainConfig, chainProvider, config);
    expect(res).toEqual({
      contracts: {
        Airnode: '0x197F3826040dF832481f835652c290aC7c41f073',
        Convenience: '0x2393737d287c555d148012270Ce4567ABb1ee95C',
      },
      settings: {
        adminAddressForCreatingProviderRecord: '0xadminAddressForCreatingProviderRecord',
        blockHistoryLimit: 600,
        chainId: 1337,
        chainType: 'evm',
        logFormat: 'plain',
        minConfirmations: 6,
        name: 'ganache-test',
        providerId: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
        url: 'http://localhost:4111',
        xpub:
          'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
      },
      config,
      coordinatorId: '837daEf231',
      currentBlock: null,
      gasPrice: null,
      masterHDNode: expect.any(ethers.utils.HDNode),
      provider,
      requests: {
        apiCalls: [],
        withdrawals: [],
      },
      transactionCountsByRequesterIndex: {},
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
    const config = fixtures.buildConfig();
    const res = state.buildEVMState(coordinatorId, chainConfig, chainProvider, config);
    expect(res).toEqual({
      contracts: {
        Airnode: '0x197F3826040dF832481f835652c290aC7c41f073',
        Convenience: '0x2393737d287c555d148012270Ce4567ABb1ee95C',
      },
      settings: {
        adminAddressForCreatingProviderRecord: '0xadminAddressForCreatingProviderRecord',
        blockHistoryLimit: 150,
        chainId: 1337,
        chainType: 'evm',
        logFormat: 'plain',
        minConfirmations: 3,
        name: 'ganache-test',
        providerId: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
        url: 'http://localhost:4111',
        xpub:
          'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
      },
      config,
      coordinatorId: '837daEf231',
      currentBlock: null,
      gasPrice: null,
      provider,
      masterHDNode: expect.any(ethers.utils.HDNode),
      requests: {
        apiCalls: [],
        withdrawals: [],
      },
      transactionCountsByRequesterIndex: {},
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
      contracts: {
        Airnode: '0xe60b966B798f9a0C41724f111225A5586ff30656',
      },
    };
    const config = fixtures.buildConfig();
    const res = state.buildEVMState(coordinatorId, chainConfig, chainProvider, config);
    expect(res).toEqual({
      contracts: {
        Airnode: '0xe60b966B798f9a0C41724f111225A5586ff30656',
        Convenience: '0x2393737d287c555d148012270Ce4567ABb1ee95C',
      },
      settings: {
        adminAddressForCreatingProviderRecord: '0xadminAddressForCreatingProviderRecord',
        blockHistoryLimit: 600,
        chainId: 1337,
        chainType: 'evm',
        logFormat: 'plain',
        minConfirmations: 6,
        name: 'ganache-test',
        providerId: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
        url: 'http://localhost:4111',
        xpub:
          'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
      },
      config,
      coordinatorId: '837daEf231',
      currentBlock: null,
      gasPrice: null,
      masterHDNode: expect.any(ethers.utils.HDNode),
      provider,
      requests: {
        apiCalls: [],
        withdrawals: [],
      },
      transactionCountsByRequesterIndex: {},
    });
  });
});

describe('update', () => {
  it('updates the state', () => {
    const newState = fixtures.buildEVMProviderState();
    const res = state.update(newState, { currentBlock: 123 });
    expect(res.currentBlock).toEqual(123);
  });
});

describe('scrub', () => {
  const SCRUB_KEYS = ['config', 'provider'];

  SCRUB_KEYS.forEach((key) => {
    it(`removes the ${key} key`, () => {
      const newState = fixtures.buildEVMProviderState();
      expect(newState[key]).not.toEqual(undefined);
      const scrubbed = state.scrub(newState);
      expect(scrubbed[key]).toEqual(undefined);
    });
  });
});

describe('unscrubEVM', () => {
  it('initializes a new provider', () => {
    const newState = fixtures.buildEVMProviderState();
    expect(newState.provider).toBeInstanceOf(Object);
    const scrubbed = state.scrub(newState);
    expect(scrubbed.provider).toEqual(undefined);
    const unscrubbed = state.unscrubEVM(scrubbed);
    expect(unscrubbed.provider).toBeInstanceOf(Object);
  });
});
