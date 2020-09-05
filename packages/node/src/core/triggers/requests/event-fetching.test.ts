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
import * as providerState from '../../providers/state';
import { ProviderState } from '../../../types';
import { removeKeys } from '../../utils/object-utils';
import * as fetcher from './event-fetching';

describe('fetchGroupedLogs', () => {
  let state: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    state = providerState.create(config, 0);
  });

  it('returns API call requests', async () => {
    const newApiCallEvent = {
      blockNumber: 10716082,
      topic: '0x74676e35c7aea7d314a29a1d492d5d8893a25cc42d1651aa8b28176f6ed1da00',
      transactionHash: '0x1',
    };
    const fulfilledApiCallEvent = {
      blockNumber: 10716083,
      topic: '0x99c3dc9fae9ea6e1e48e90bf434d9b64c4ebdb218f1a39f1752cccfa010c71e3',
      transactionHash: '0x2',
    };
    const unknownEvent = {
      blockNumber: 10716082,
      topic: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b',
      transactionHash: '0x3',
    };
    const getLogs = state.provider.getLogs as jest.Mock;
    getLogs.mockResolvedValueOnce([newApiCallEvent, fulfilledApiCallEvent, unknownEvent]);

    // TODO: We probably shouldn't be mocking the interface, but need to find
    // a stable way to have the ABI accessible in the tests
    const contractInterface = new ethers.utils.Interface('abi here');
    const parseLog = contractInterface.parseLog as jest.Mock;
    parseLog.mockReturnValueOnce(removeKeys(newApiCallEvent, ['blockNumber', 'transactionHash']));
    parseLog.mockReturnValueOnce(removeKeys(fulfilledApiCallEvent, ['blockNumber', 'transactionHash']));
    parseLog.mockReturnValueOnce(removeKeys(unknownEvent, ['blockNumber', 'transactionHash']));

    const res = await fetcher.fetchGroupedLogs(state);
    expect(res).toEqual({
      apiCalls: [
        {
          blockNumber: 10716082,
          parsedLog: { topic: '0x74676e35c7aea7d314a29a1d492d5d8893a25cc42d1651aa8b28176f6ed1da00' },
          transactionHash: '0x1',
        },
        {
          blockNumber: 10716083,
          parsedLog: { topic: '0x99c3dc9fae9ea6e1e48e90bf434d9b64c4ebdb218f1a39f1752cccfa010c71e3' },
          transactionHash: '0x2',
        },
      ],
      walletDesignations: [],
      withdrawals: [],
    });
  });

  it('returns wallet designation requests', async () => {
    const newWalletDesignationEvent = {
      blockNumber: 10716082,
      topic: '0x82a39020b75d675eeedadd41636e88c5e43c4604955bbfb64f6017aa9ae39ba6',
      transactionHash: '0x1',
    };
    const fulfilledWalletDesignationEvent = {
      blockNumber: 10716083,
      topic: '0x82a39020b75d675eeedadd41636e88c5e43c4604955bbfb64f6017aa9ae39ba6',
      transactionHash: '0x2',
    };
    const unknownEvent = {
      blockNumber: 10716082,
      topic: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b',
      transactionHash: '0x3',
    };

    const getLogs = state.provider.getLogs as jest.Mock;
    getLogs.mockResolvedValueOnce([newWalletDesignationEvent, fulfilledWalletDesignationEvent, unknownEvent]);

    // TODO: We probably shouldn't be mocking the interface, but need to find
    // a stable way to have the ABI accessible in the tests
    const contractInterface = new ethers.utils.Interface('abi here');
    const parseLog = contractInterface.parseLog as jest.Mock;
    parseLog.mockReturnValueOnce(removeKeys(newWalletDesignationEvent, ['blockNumber', 'transactionHash']));
    parseLog.mockReturnValueOnce(removeKeys(fulfilledWalletDesignationEvent, ['blockNumber', 'transactionHash']));
    parseLog.mockReturnValueOnce(removeKeys(unknownEvent, ['blockNumber', 'transactionHash']));

    const res = await fetcher.fetchGroupedLogs(state);
    expect(res).toEqual({
      apiCalls: [],
      walletDesignations: [
        {
          blockNumber: 10716082,
          parsedLog: {
            topic: '0x82a39020b75d675eeedadd41636e88c5e43c4604955bbfb64f6017aa9ae39ba6',
          },
          transactionHash: '0x1',
        },
        {
          blockNumber: 10716083,
          parsedLog: {
            topic: '0x82a39020b75d675eeedadd41636e88c5e43c4604955bbfb64f6017aa9ae39ba6',
          },
          transactionHash: '0x2',
        },
      ],
      withdrawals: [],
    });
  });

  it('returns withdrawal requests', async () => {
    const newWithdrawalEvent = {
      blockNumber: 10716082,
      topic: '0xd4e56e460d621aa2f11bdd25752d5f87a72d0ebe2cd6cd4809476d4a3169ae2b',
      transactionHash: '0x1',
    };
    const fulfilledWithdrawalEvent = {
      blockNumber: 10716083,
      topic: '0xe5eb6dd249cfe3ecb285b2064c23288cfcf3a6728f3c45f89811852bb894e439',
      transactionHash: '0x2',
    };
    const unknownEvent = {
      blockNumber: 10716082,
      topic: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b',
      transactionHash: '0x3',
    };

    const getLogs = state.provider.getLogs as jest.Mock;
    getLogs.mockResolvedValueOnce([newWithdrawalEvent, fulfilledWithdrawalEvent, unknownEvent]);

    // TODO: We probably shouldn't be mocking the interface, but need to find
    // a stable way to have the ABI accessible in the tests
    const contractInterface = new ethers.utils.Interface('abi here');
    const parseLog = contractInterface.parseLog as jest.Mock;
    parseLog.mockReturnValueOnce(removeKeys(newWithdrawalEvent, ['blockNumber', 'transactionHash']));
    parseLog.mockReturnValueOnce(removeKeys(fulfilledWithdrawalEvent, ['blockNumber', 'transactionHash']));
    parseLog.mockReturnValueOnce(removeKeys(unknownEvent, ['blockNumber', 'transactionHash']));

    const res = await fetcher.fetchGroupedLogs(state);
    expect(res).toEqual({
      apiCalls: [],
      walletDesignations: [],
      withdrawals: [
        {
          blockNumber: 10716082,
          parsedLog: {
            topic: '0xd4e56e460d621aa2f11bdd25752d5f87a72d0ebe2cd6cd4809476d4a3169ae2b',
          },
          transactionHash: '0x1',
        },
        {
          blockNumber: 10716083,
          parsedLog: {
            topic: '0xe5eb6dd249cfe3ecb285b2064c23288cfcf3a6728f3c45f89811852bb894e439',
          },
          transactionHash: '0x2',
        },
      ],
    });
  });
});
