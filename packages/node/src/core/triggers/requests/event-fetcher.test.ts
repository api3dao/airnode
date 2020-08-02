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

  pending('it returns wallet designation requests');

  it('returns withdrawal requests', async () => {
    const newWithdrawalEvent = { topic: '0x807501b4a176d068b18e979406a05a3f7d8af479ad2a683f53902fda520a9a0a' };
    const fulfilledWithdrawalEvent = { topic: '0x084726378542eff0a6413e6eedb6ee4a0627af74e550b735ad448acede3165fc' };
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
