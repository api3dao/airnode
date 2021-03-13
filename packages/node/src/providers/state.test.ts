import { ethers } from 'ethers';
import * as fixtures from 'test/fixtures';
import { ChainConfig, ChainProvider } from 'src/types';
import * as state from './state';

describe('create', () => {
  it('returns a clean state with defaults', () => {
    const coordinatorId = '837daEf231';
    const chainProvider: ChainProvider = { name: 'ganache-test', url: 'http://localhost:4111' };
    const chainConfig: ChainConfig = {
      authorizers: [ethers.constants.AddressZero],
      contracts: {
        AirnodeRrp: '0x197F3826040dF832481f835652c290aC7c41f073',
      },
      id: 1337,
      airnodeAdmin: '0xairnodeAdmin',
      providers: [chainProvider],
      type: 'evm',
    };
    const config = fixtures.buildConfig();
    const res = state.buildEVMState(coordinatorId, chainConfig, chainProvider, config);
    expect(res).toEqual({
      contracts: {
        AirnodeRrp: '0x197F3826040dF832481f835652c290aC7c41f073',
      },
      settings: {
        authorizers: [ethers.constants.AddressZero],
        airnodeAdmin: '0xairnodeAdmin',
        blockHistoryLimit: 300,
        chainId: 1337,
        chainType: 'evm',
        ignoreBlockedRequestsAfterBlocks: 20,
        logFormat: 'plain',
        minConfirmations: 0,
        name: 'ganache-test',
        airnodeId: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
        airnodeIdShort: '19255a4',
        region: 'us-east-1',
        stage: 'test',
        url: 'http://localhost:4111',
        xpub:
          'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
      },
      config,
      coordinatorId: '837daEf231',
      currentBlock: null,
      gasPrice: null,
      masterHDNode: expect.any(ethers.utils.HDNode),
      provider: expect.any(ethers.providers.JsonRpcProvider),
      requests: {
        apiCalls: [],
        withdrawals: [],
      },
      transactionCountsByRequesterIndex: {},
    });
  });

  it('allows for overwriting settings', () => {
    const coordinatorId = '837daEf231';
    const chainProvider: ChainProvider = { name: 'ganache-test', url: 'http://localhost:4111' };
    const chainConfig: ChainConfig = {
      authorizers: [ethers.constants.AddressZero],
      blockHistoryLimit: 150,
      contracts: {
        AirnodeRrp: '0x197F3826040dF832481f835652c290aC7c41f073',
      },
      id: 1337,
      minConfirmations: 3,
      providers: [chainProvider],
      airnodeAdmin: '0xairnodeAdmin',
      type: 'evm',
    };
    const config = fixtures.buildConfig();
    const res = state.buildEVMState(coordinatorId, chainConfig, chainProvider, config);
    expect(res).toEqual({
      contracts: {
        AirnodeRrp: '0x197F3826040dF832481f835652c290aC7c41f073',
      },
      settings: {
        authorizers: [ethers.constants.AddressZero],
        airnodeAdmin: '0xairnodeAdmin',
        blockHistoryLimit: 150,
        chainId: 1337,
        chainType: 'evm',
        ignoreBlockedRequestsAfterBlocks: 20,
        logFormat: 'plain',
        minConfirmations: 3,
        name: 'ganache-test',
        airnodeId: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
        airnodeIdShort: '19255a4',
        region: 'us-east-1',
        stage: 'test',
        url: 'http://localhost:4111',
        xpub:
          'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
      },
      config,
      coordinatorId: '837daEf231',
      currentBlock: null,
      gasPrice: null,
      masterHDNode: expect.any(ethers.utils.HDNode),
      provider: expect.any(ethers.providers.JsonRpcProvider),
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

describe('refresh', () => {
  describe('EVM provider state', () => {
    it('initializes a new provider', () => {
      const newState = fixtures.buildEVMProviderState();
      expect(newState.provider).toBeInstanceOf(ethers.providers.JsonRpcProvider);
      const scrubbed = state.scrub(newState);
      expect(scrubbed.provider).toEqual(undefined);
      const refreshed = state.refresh(scrubbed);
      expect(refreshed.provider).toBeInstanceOf(ethers.providers.JsonRpcProvider);
    });

    it('initializes a new master HD node', () => {
      const newState = fixtures.buildEVMProviderState();
      expect(newState.masterHDNode).toBeInstanceOf(ethers.utils.HDNode);
      const scrubbed = state.scrub(newState);
      expect(scrubbed.masterHDNode).toEqual(undefined);
      const refreshed = state.refresh(scrubbed);
      expect(refreshed.masterHDNode).toBeInstanceOf(ethers.utils.HDNode);
    });
  });
});
