import { ethers } from 'ethers';
import * as state from './state';
import * as fixtures from '../../test/fixtures';
import { ChainConfig, EVMProviderState, ProviderState } from '../types';

describe('create', () => {
  it('returns a clean state with defaults', () => {
    const coordinatorId = '837daEf231';
    const chainType = 'evm';
    const chainId = '1337';
    const chainProviderName = 'Ganache test';
    const chainConfig: ChainConfig = {
      authorizers: [ethers.constants.AddressZero],
      contracts: {
        AirnodeRrp: '0x197F3826040dF832481f835652c290aC7c41f073',
      },
      id: chainId,
      providers: {
        [chainProviderName]: {
          url: 'http://localhost:4111',
        },
      },
      type: chainType,
    };
    const config = fixtures.buildConfig();
    const res = state.buildEVMState(coordinatorId, chainConfig, chainProviderName, config);
    expect(res).toEqual({
      contracts: {
        AirnodeRrp: '0x197F3826040dF832481f835652c290aC7c41f073',
      },
      settings: {
        airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
        airnodeAddressShort: 'a30ca71',
        authorizers: [ethers.constants.AddressZero],
        blockHistoryLimit: 300,
        chainId: '1337',
        chainType: 'evm',
        ignoreBlockedRequestsAfterBlocks: 20,
        logFormat: 'plain',
        logLevel: 'DEBUG',
        minConfirmations: 0,
        name: 'Ganache test',
        region: 'us-east-1',
        stage: 'test',
        url: 'http://localhost:4111',
        xpub: 'xpub6C8tvRgYkjNVaGMtpyZf4deBcUQHf7vgWUraVxY6gYiZhBYbPkFkLLWJzUUeVFdkKpVtatmXHX8kB76xgfmTpVZWbVWdq1rneaAY6a8RtbY',
      },
      config,
      coordinatorId: '837daEf231',
      currentBlock: null,
      gasPrice: null,
      id: expect.anything(),
      masterHDNode: expect.any(ethers.utils.HDNode),
      provider: expect.any(ethers.providers.JsonRpcProvider),
      requests: {
        apiCalls: [],
        withdrawals: [],
      },
      transactionCountsBySponsorAddress: {},
    });
  });

  it('allows for overwriting settings', () => {
    const coordinatorId = '837daEf231';
    const chainType = 'evm';
    const chainId = '1337';
    const chainProviderName = 'Ganache test';
    const chainConfig: ChainConfig = {
      authorizers: [ethers.constants.AddressZero],
      blockHistoryLimit: 150,
      contracts: {
        AirnodeRrp: '0x197F3826040dF832481f835652c290aC7c41f073',
      },
      id: chainId,
      minConfirmations: 3,
      providers: {
        [chainProviderName]: {
          url: 'http://localhost:4111',
        },
      },
      type: chainType,
    };
    const config = fixtures.buildConfig();
    const res = state.buildEVMState(coordinatorId, chainConfig, chainProviderName, config);
    expect(res).toEqual({
      contracts: {
        AirnodeRrp: '0x197F3826040dF832481f835652c290aC7c41f073',
      },
      settings: {
        airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
        airnodeAddressShort: 'a30ca71',
        authorizers: [ethers.constants.AddressZero],
        blockHistoryLimit: 150,
        chainId: '1337',
        chainType: 'evm',
        ignoreBlockedRequestsAfterBlocks: 20,
        logFormat: 'plain',
        logLevel: 'DEBUG',
        minConfirmations: 3,
        name: 'Ganache test',
        region: 'us-east-1',
        stage: 'test',
        url: 'http://localhost:4111',
        xpub: 'xpub6C8tvRgYkjNVaGMtpyZf4deBcUQHf7vgWUraVxY6gYiZhBYbPkFkLLWJzUUeVFdkKpVtatmXHX8kB76xgfmTpVZWbVWdq1rneaAY6a8RtbY',
      },
      config,
      coordinatorId: '837daEf231',
      currentBlock: null,
      gasPrice: null,
      id: expect.anything(),
      masterHDNode: expect.any(ethers.utils.HDNode),
      provider: expect.any(ethers.providers.JsonRpcProvider),
      requests: {
        apiCalls: [],
        withdrawals: [],
      },
      transactionCountsBySponsorAddress: {},
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
      expect(newState[key as keyof ProviderState<EVMProviderState>]).not.toEqual(undefined);
      const scrubbed = state.scrub(newState);
      expect(scrubbed[key as keyof ProviderState<EVMProviderState>]).toEqual(undefined);
    });
  });
});

describe('refresh', () => {
  describe('EVM provider state', () => {
    it('initializes a new provider', () => {
      const newState = fixtures.buildEVMProviderState();
      expect(newState.provider).toBeInstanceOf(ethers.providers.JsonRpcProvider);
      const scrubbed = state.scrub(newState);
      expect(scrubbed.provider).toEqual(undefined);
      const refreshed = state.refresh({ ...scrubbed, config: fixtures.buildConfig() });
      expect(refreshed.provider).toBeInstanceOf(ethers.providers.JsonRpcProvider);
    });

    it('initializes a new master HD node', () => {
      const newState = fixtures.buildEVMProviderState();
      expect(newState.masterHDNode).toBeInstanceOf(ethers.utils.HDNode);
      const scrubbed = state.scrub(newState);
      expect(scrubbed.masterHDNode).toEqual(undefined);
      const refreshed = state.refresh({ ...scrubbed, config: fixtures.buildConfig() });
      expect(refreshed.masterHDNode).toBeInstanceOf(ethers.utils.HDNode);
    });
  });
});
