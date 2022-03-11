import { ethers } from 'ethers';
import * as state from './state';
import * as fixtures from '../../test/fixtures';
import { EVMProviderState, ProviderState } from '../types';
import { ChainConfig } from '../config/types';

describe('create', () => {
  it('returns a clean state with defaults', () => {
    const coordinatorId = '837daEf231';
    const chainType = 'evm';
    const chainId = '1337';
    const chainProviderName = 'Ganache test';
    const chainConfig: ChainConfig = {
      maxConcurrency: 100,
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
      options: {
        txType: 'eip1559',
        baseFeeMultiplier: 2,
        priorityFee: {
          value: 3.12,
          unit: 'gwei',
        },
      },
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
        chainOptions: {
          txType: 'eip1559',
          baseFeeMultiplier: 2,
          priorityFee: {
            value: 3.12,
            unit: 'gwei',
          },
        },
        ignoreBlockedRequestsAfterBlocks: 20,
        logFormat: 'plain',
        logLevel: 'DEBUG',
        minConfirmations: 0,
        name: 'Ganache test',
        cloudProvider: {
          type: 'local',
        },
        stage: 'test',
        url: 'http://localhost:4111',
        xpub: 'xpub6C8tvRgYkjNVaGMtpyZf4deBcUQHf7vgWUraVxY6gYiZhBYbPkFkLLWJzUUeVFdkKpVtatmXHX8kB76xgfmTpVZWbVWdq1rneaAY6a8RtbY',
      },
      config,
      coordinatorId: '837daEf231',
      currentBlock: null,
      gasTarget: null,
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
      maxConcurrency: 100,
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
      options: {
        txType: 'eip1559',
        baseFeeMultiplier: 2,
        priorityFee: {
          value: 3.12,
          unit: 'gwei',
        },
      },
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
        chainOptions: {
          txType: 'eip1559',
          baseFeeMultiplier: 2,
          priorityFee: {
            value: 3.12,
            unit: 'gwei',
          },
        },
        chainType: 'evm',
        ignoreBlockedRequestsAfterBlocks: 20,
        logFormat: 'plain',
        logLevel: 'DEBUG',
        minConfirmations: 3,
        name: 'Ganache test',
        cloudProvider: {
          type: 'local',
        },
        stage: 'test',
        url: 'http://localhost:4111',
        xpub: 'xpub6C8tvRgYkjNVaGMtpyZf4deBcUQHf7vgWUraVxY6gYiZhBYbPkFkLLWJzUUeVFdkKpVtatmXHX8kB76xgfmTpVZWbVWdq1rneaAY6a8RtbY',
      },
      config,
      coordinatorId: '837daEf231',
      currentBlock: null,
      gasTarget: null,
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

describe('splitStatesBySponsorAddress', () => {
  it('splits provider states based on the request sponsor address', () => {
    const mixedRequest1 = fixtures.requests.buildApiCall({
      sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
    });
    const mixedRequest2 = fixtures.requests.buildApiCall({
      sponsorAddress: '0x815008C3327dA9ce35f824df29bF31486797C5D1',
    });
    const mixedWithdrawal1 = fixtures.requests.buildWithdrawal({
      sponsorAddress: '0x815008C3327dA9ce35f824df29bF31486797C5D1',
    });

    const sameRequest1 = fixtures.requests.buildApiCall({
      sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
    });
    const sameWithdrawal1 = fixtures.requests.buildWithdrawal({
      sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
    });

    const differentRequest1 = fixtures.requests.buildApiCall({
      sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
    });
    const differentWithdrawal1 = fixtures.requests.buildWithdrawal({
      sponsorAddress: '0xcD9B7680110b11fac877F8be9d5D4334fb3d7A9B',
    });

    let stateWithMixedSponsorAddreses = fixtures.buildEVMProviderState();
    stateWithMixedSponsorAddreses = state.update(stateWithMixedSponsorAddreses, {
      requests: { apiCalls: [mixedRequest1, mixedRequest2], withdrawals: [mixedWithdrawal1] },
    });
    let stateWithSameSponsorAddreses = fixtures.buildEVMProviderState();
    stateWithSameSponsorAddreses = state.update(stateWithSameSponsorAddreses, {
      requests: { apiCalls: [sameRequest1], withdrawals: [sameWithdrawal1] },
    });
    let stateWithDifferentSponsorAddreses = fixtures.buildEVMProviderState();
    stateWithDifferentSponsorAddreses = state.update(stateWithDifferentSponsorAddreses, {
      requests: { apiCalls: [differentRequest1], withdrawals: [differentWithdrawal1] },
    });

    const providerStates = {
      evm: [stateWithMixedSponsorAddreses, stateWithSameSponsorAddreses, stateWithDifferentSponsorAddreses],
    };

    const providerSponsorStates = state.splitStatesBySponsorAddress(providerStates);
    let providerSponsorState1 = fixtures.buildEVMProviderSponsorState({
      sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
      id: stateWithMixedSponsorAddreses.id,
    });
    providerSponsorState1 = state.update(providerSponsorState1, {
      requests: { apiCalls: [mixedRequest1], withdrawals: [] },
    });
    let providerSponsorState2 = fixtures.buildEVMProviderSponsorState({
      sponsorAddress: '0x815008C3327dA9ce35f824df29bF31486797C5D1',
      id: stateWithMixedSponsorAddreses.id,
    });
    providerSponsorState2 = state.update(providerSponsorState2, {
      requests: { apiCalls: [mixedRequest2], withdrawals: [mixedWithdrawal1] },
    });
    let providerSponsorState3 = fixtures.buildEVMProviderSponsorState({
      sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
      id: stateWithSameSponsorAddreses.id,
    });
    providerSponsorState3 = state.update(providerSponsorState3, {
      requests: { apiCalls: [sameRequest1], withdrawals: [sameWithdrawal1] },
    });
    let providerSponsorState4 = fixtures.buildEVMProviderSponsorState({
      sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
      id: stateWithDifferentSponsorAddreses.id,
    });
    providerSponsorState4 = state.update(providerSponsorState4, {
      requests: { apiCalls: [differentRequest1], withdrawals: [] },
    });
    let providerSponsorState5 = fixtures.buildEVMProviderSponsorState({
      sponsorAddress: '0xcD9B7680110b11fac877F8be9d5D4334fb3d7A9B',
      id: stateWithDifferentSponsorAddreses.id,
    });
    providerSponsorState5 = state.update(providerSponsorState5, {
      requests: { apiCalls: [], withdrawals: [differentWithdrawal1] },
    });

    expect(providerSponsorStates).toEqual([
      providerSponsorState1,
      providerSponsorState2,
      providerSponsorState3,
      providerSponsorState4,
      providerSponsorState5,
    ]);
  });
});
