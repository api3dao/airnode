import { ethers } from 'ethers';
import * as fixtures from 'test/fixtures';
import { ChainConfig, ChainProvider } from 'src/types';
import * as state from './state';

describe('create', () => {
  it('returns a clean state with defaults', () => {
    const coordinatorId = '837daEf231';
    const chainProvider: ChainProvider = { name: 'ganache-test', url: 'http://localhost:4111' };
    const chainConfig: ChainConfig = {
      adminAddressForCreatingProviderRecord: '0xadminAddressForCreatingProviderRecord',
      contracts: {
        Airnode: '0x197F3826040dF832481f835652c290aC7c41f073',
        Convenience: '0x2393737d287c555d148012270Ce4567ABb1ee95C',
      },
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
        providerIdShort: '19255a4',
        url: 'http://localhost:4111',
        xpub:
          'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
      },
      config,
      coordinatorId: '837daEf231',
      currentBlock: null,
      gasPrice: null,
      masterHDNode: expect.any(ethers.utils.HDNode),
      provider: expect.anything(),
      requests: {
        apiCalls: [],
        withdrawals: [],
      },
      transactionCountsByRequesterIndex: {},
    });
  });

  it('allows for overwriting settings', () => {
    const coordinatorId = '837daEf231';
    const chainProvider: ChainProvider = {
      blockHistoryLimit: 150,
      minConfirmations: 3,
      name: 'ganache-test',
      url: 'http://localhost:4111',
    };
    const chainConfig: ChainConfig = {
      adminAddressForCreatingProviderRecord: '0xadminAddressForCreatingProviderRecord',
      contracts: {
        Airnode: '0x197F3826040dF832481f835652c290aC7c41f073',
        Convenience: '0x2393737d287c555d148012270Ce4567ABb1ee95C',
      },
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
        providerIdShort: '19255a4',
        url: 'http://localhost:4111',
        xpub:
          'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
      },
      config,
      coordinatorId: '837daEf231',
      currentBlock: null,
      gasPrice: null,
      provider: expect.anything(),
      masterHDNode: expect.any(ethers.utils.HDNode),
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

describe('unscrub', () => {
  describe('EVM provider state', () => {
    it('initializes a new provider', () => {
      const newState = fixtures.buildEVMProviderState();
      expect(newState.provider).toBeInstanceOf(Object);
      const scrubbed = state.scrub(newState);
      expect(scrubbed.provider).toEqual(undefined);
      const unscrubbed = state.unscrub(scrubbed);
      expect(unscrubbed.provider).toBeInstanceOf(Object);
    });

    it('initializes a new master HD node', () => {
      const newState = fixtures.buildEVMProviderState();
      expect(newState.masterHDNode).toBeInstanceOf(ethers.utils.HDNode);
      const scrubbed = state.scrub(newState);
      expect(scrubbed.masterHDNode).toEqual(undefined);
      const unscrubbed = state.unscrub(scrubbed);
      expect(unscrubbed.masterHDNode).toBeInstanceOf(ethers.utils.HDNode);
    });
  });
});
