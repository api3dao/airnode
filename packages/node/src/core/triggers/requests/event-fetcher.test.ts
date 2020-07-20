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
      walletAuthorizations: [],
      withdrawals: [],
    },
  };

  it('returns API call requests', async () => {
    const newApiCallEvent = { topic: '0xcc16afda5deb199fd8f8fd4e020759442c86c50d17b076e5860480f358723f57' };
    const fulfilledApiCallEvent = { topic: '0x3c2f447d340db42db304efeef49513562c20438b6e893f65e015096896b5d167' };
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
      walletAuthorizations: [],
      withdrawals: [],
    });
  });

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
      walletAuthorizations: [],
      withdrawals: [newWithdrawalEvent, fulfilledWithdrawalEvent],
    });
  });
});
