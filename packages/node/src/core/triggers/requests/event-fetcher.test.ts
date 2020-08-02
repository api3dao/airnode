const getLogsMock = jest.fn();
const parseLogMock = jest.fn();
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ethers: {
      ...original,
      providers: {
        JsonRpcProvider: jest.fn().mockImplementation(() => ({
          getLogs: getLogsMock,
        })),
      },
      utils: {
        ...original.utils,
        Interface: jest.fn().mockImplementation(() => ({
          parseLog: parseLogMock,
        })),
      },
    },
  };
});

jest.mock('../../config', () => ({
  config: {
    nodeSettings: {
      providerId: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b',
    },
  },
  FROM_BLOCK_LIMIT: 100,
}));

import { ethers } from 'ethers';
import { ProviderState } from '../../../types';
import * as fetcher from './event-fetcher';

describe('fetchGroupedLogs', () => {
  const state: ProviderState = {
    config: { chainId: 1337, name: 'ganache', url: 'https://...' },
    currentBlock: 1000,
    gasPrice: null,
    index: 0,
    provider: new ethers.providers.JsonRpcProvider(),
    requests: {
      apiCalls: [],
      walletDesignations: [],
      withdrawals: [],
    },
  };

  it('returns API call requests', async () => {
    const newApiCallEvent = { topic: '0x74676e35c7aea7d314a29a1d492d5d8893a25cc42d1651aa8b28176f6ed1da00' };
    const fulfilledApiCallEvent = { topic: '0x99c3dc9fae9ea6e1e48e90bf434d9b64c4ebdb218f1a39f1752cccfa010c71e3' };
    const unknownEvent = { topic: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b' };

    const getLogs = state.provider.getLogs as jest.Mock;
    getLogs.mockResolvedValueOnce([newApiCallEvent, fulfilledApiCallEvent, unknownEvent]);

    // TODO: We probably shouldn't be mocking the interface, but need to find
    // a stable way to have the ABI accessible in the tests
    const contractInterface = new ethers.utils.Interface('abi here');
    const parseLog = contractInterface.parseLog as jest.Mock;
    parseLog.mockReturnValueOnce(newApiCallEvent);
    parseLog.mockReturnValueOnce(fulfilledApiCallEvent);
    parseLog.mockReturnValueOnce(unknownEvent);

    const res = await fetcher.fetchGroupedLogs(state);
    expect(res).toEqual({
      apiCalls: [newApiCallEvent, fulfilledApiCallEvent],
      walletDesignations: [],
      withdrawals: [],
    });
  });

  it('returns wallet designation requests', async () => {
    const newWalletDesignationEvent = { topic: '0x82a39020b75d675eeedadd41636e88c5e43c4604955bbfb64f6017aa9ae39ba6' };
    const fulfilledWalletDesignationEvent = { topic: '0x82a39020b75d675eeedadd41636e88c5e43c4604955bbfb64f6017aa9ae39ba6' };
    const unknownEvent = { topic: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b' };

    const getLogs = state.provider.getLogs as jest.Mock;
    getLogs.mockResolvedValueOnce([newWalletDesignationEvent, fulfilledWalletDesignationEvent, unknownEvent]);

    // TODO: We probably shouldn't be mocking the interface, but need to find
    // a stable way to have the ABI accessible in the tests
    const contractInterface = new ethers.utils.Interface('abi here');
    const parseLog = contractInterface.parseLog as jest.Mock;
    parseLog.mockReturnValueOnce(newWalletDesignationEvent);
    parseLog.mockReturnValueOnce(fulfilledWalletDesignationEvent);
    parseLog.mockReturnValueOnce(unknownEvent);

    const res = await fetcher.fetchGroupedLogs(state);
    expect(res).toEqual({
      apiCalls: [],
      walletDesignations: [newWalletDesignationEvent, fulfilledWalletDesignationEvent],
      withdrawals: [],
    });
  });

  it('returns withdrawal requests', async () => {
    const newWithdrawalEvent = { topic: '0xd4e56e460d621aa2f11bdd25752d5f87a72d0ebe2cd6cd4809476d4a3169ae2b' };
    const fulfilledWithdrawalEvent = { topic: '0xe5eb6dd249cfe3ecb285b2064c23288cfcf3a6728f3c45f89811852bb894e439' };
    const unknownEvent = { topic: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b' };

    const getLogs = state.provider.getLogs as jest.Mock;
    getLogs.mockResolvedValueOnce([newWithdrawalEvent, fulfilledWithdrawalEvent, unknownEvent]);

    // TODO: We probably shouldn't be mocking the interface, but need to find
    // a stable way to have the ABI accessible in the tests
    const contractInterface = new ethers.utils.Interface('abi here');
    const parseLog = contractInterface.parseLog as jest.Mock;
    parseLog.mockReturnValueOnce(newWithdrawalEvent);
    parseLog.mockReturnValueOnce(fulfilledWithdrawalEvent);
    parseLog.mockReturnValueOnce(unknownEvent);

    const res = await fetcher.fetchGroupedLogs(state);
    expect(res).toEqual({
      apiCalls: [],
      walletDesignations: [],
      withdrawals: [newWithdrawalEvent, fulfilledWithdrawalEvent],
    });
  });
});
