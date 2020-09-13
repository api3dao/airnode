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

jest.mock('../../../config', () => ({
  config: {
    nodeSettings: {
      providerId: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b',
    },
  },
  FROM_BLOCK_LIMIT: 100,
}));

import { ethers } from 'ethers';
import { removeKeys } from '../../../utils/object-utils';
import * as eventLogs from './event-logs';

describe('EVM event logs - fetch', () => {
  it('returns all logs with metadata', async () => {
    const provider = new ethers.providers.JsonRpcProvider();
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

    const getLogs = provider.getLogs as jest.Mock;
    getLogs.mockResolvedValueOnce([newApiCallEvent, fulfilledApiCallEvent, unknownEvent]);

    // TODO: We probably shouldn't be mocking the interface, but need to find
    // a stable way to have the ABI accessible in the tests
    const contractInterface = new ethers.utils.Interface('abi here');
    const parseLog = contractInterface.parseLog as jest.Mock;
    parseLog.mockReturnValueOnce(removeKeys(newApiCallEvent, ['blockNumber', 'transactionHash']));
    parseLog.mockReturnValueOnce(removeKeys(fulfilledApiCallEvent, ['blockNumber', 'transactionHash']));
    parseLog.mockReturnValueOnce(removeKeys(unknownEvent, ['blockNumber', 'transactionHash']));

    const fetchOptions = {
      address: '0xe60b966B798f9a0C41724f111225A5586ff30656',
      currentBlock: 10716084,
      provider: new ethers.providers.JsonRpcProvider(),
    };

    const res = await eventLogs.fetch(fetchOptions);
    expect(res).toEqual([
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
      {
        blockNumber: 10716082,
        parsedLog: { topic: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b' },
        transactionHash: '0x3',
      }
    ]);
  });

  it('throws an exception if the logs cannot be fetched', async () => {
    expect.assertions(1);
    const provider = new ethers.providers.JsonRpcProvider();
    const getLogs = provider.getLogs as jest.Mock;
    getLogs.mockRejectedValueOnce(new Error('Unable to fetch logs'));

    const fetchOptions = {
      address: '0xe60b966B798f9a0C41724f111225A5586ff30656',
      currentBlock: 10716084,
      provider: new ethers.providers.JsonRpcProvider(),
    };
    try {
      await eventLogs.fetch(fetchOptions);
    } catch (e) {
      expect(e).toEqual(new Error('Unable to fetch logs'));
    }
  });

  it('throws an exception if the logs cannot be parsed', async () => {
    expect.assertions(1);
    const provider = new ethers.providers.JsonRpcProvider();
    const newApiCallEvent = {
      blockNumber: 10716082,
      topic: '0xinvalidtopic',
      transactionHash: '0x1',
    };
    const getLogs = provider.getLogs as jest.Mock;
    getLogs.mockResolvedValueOnce([newApiCallEvent]);

    // TODO: We probably shouldn't be mocking the interface, but need to find
    // a stable way to have the ABI accessible in the tests
    const contractInterface = new ethers.utils.Interface('abi here');
    const parseLog = contractInterface.parseLog as jest.Mock;
    parseLog.mockImplementationOnce(() => { throw new Error('Unable to parse topic'); });

    const fetchOptions = {
      address: '0xe60b966B798f9a0C41724f111225A5586ff30656',
      currentBlock: 10716084,
      provider: new ethers.providers.JsonRpcProvider(),
    };
    try {
      await eventLogs.fetch(fetchOptions);
    } catch (e) {
      expect(e).toEqual(new Error('Unable to parse topic'));
    }
  });
});

describe('EVM event logs - group', () => {
  it('groups apiCall requests and fulfillments', () => {
    const logsWithMetadata: any = [
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
      // Unknown event
      {
        blockNumber: 10716082,
        parsedLog: { topic: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b' },
        transactionHash: '0x3',
      }
    ];

    const res = eventLogs.group(logsWithMetadata);
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

  it('groups wallet designation requests and fulfillments', () => {
    const logsWithMetadata: any = [
      {
        blockNumber: 10716082,
        parsedLog: { topic: '0x54731539873419bbdf008e1d7a666aeed0a8e141953b2dd4ba187dba3981bfc3' },
        transactionHash: '0x1',
      },
      {
        blockNumber: 10716083,
        parsedLog: { topic: '0x82a39020b75d675eeedadd41636e88c5e43c4604955bbfb64f6017aa9ae39ba6' },
        transactionHash: '0x2',
      },
      // Unknown event
      {
        blockNumber: 10716082,
        parsedLog: { topic: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b' },
        transactionHash: '0x3',
      }
    ];

    const res = eventLogs.group(logsWithMetadata);
    expect(res).toEqual({
      apiCalls: [],
      walletDesignations: [
        {
          blockNumber: 10716082,
          parsedLog: { topic: '0x54731539873419bbdf008e1d7a666aeed0a8e141953b2dd4ba187dba3981bfc3' },
          transactionHash: '0x1',
        },
        {
          blockNumber: 10716083,
          parsedLog: { topic: '0x82a39020b75d675eeedadd41636e88c5e43c4604955bbfb64f6017aa9ae39ba6' },
          transactionHash: '0x2',
        }
      ],
      withdrawals: [],
    });
  });

  it('groups withdrawal requests and fulfillments', () => {
    const logsWithMetadata: any = [
      {
        blockNumber: 10716082,
        parsedLog: { topic: '0xd4e56e460d621aa2f11bdd25752d5f87a72d0ebe2cd6cd4809476d4a3169ae2b' },
        transactionHash: '0x1',
      },
      {
        blockNumber: 10716083,
        parsedLog: { topic: '0xe5eb6dd249cfe3ecb285b2064c23288cfcf3a6728f3c45f89811852bb894e439' },
        transactionHash: '0x2',
      },
      // Unknown event
      {
        blockNumber: 10716082,
        parsedLog: { topic: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b' },
        transactionHash: '0x3',
      }
    ];

    const res = eventLogs.group(logsWithMetadata);
    expect(res).toEqual({
      apiCalls: [],
      walletDesignations: [],
      withdrawals: [
        {
          blockNumber: 10716082,
          parsedLog: { topic: '0xd4e56e460d621aa2f11bdd25752d5f87a72d0ebe2cd6cd4809476d4a3169ae2b' },
          transactionHash: '0x1',
        },
        {
          blockNumber: 10716083,
          parsedLog: { topic: '0xe5eb6dd249cfe3ecb285b2064c23288cfcf3a6728f3c45f89811852bb894e439' },
          transactionHash: '0x2',
        }
      ],
    });
  });
});
