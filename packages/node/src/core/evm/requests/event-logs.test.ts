const parseLogMock = jest.fn();
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ethers: {
      ...original,
      utils: {
        ...original.utils,
        Interface: jest.fn().mockImplementation(() => ({
          parseLog: parseLogMock,
        })),
      },
    },
  };
});

import { ethers } from 'ethers';
import { removeKeys } from '../../utils/object-utils';
import * as eventLogs from './event-logs';

describe('EVM event logs - fetch', () => {
  it('returns all logs with metadata', async () => {
    const newApiCallEvent = {
      blockNumber: 10716082,
      topic: '0xaff6f5e5548953a11cbb1cfdd76562512f969b0eba0a2163f2420630d4dda97b',
      transactionHash: '0x1',
    };
    const fulfilledApiCallEvent = {
      blockNumber: 10716083,
      topic: '0x1bdbe9e5d42a025a741fc3582eb3cad4ef61ac742d83cc87e545fbd481b926b5',
      transactionHash: '0x2',
    };
    const unknownEvent = {
      blockNumber: 10716082,
      topic: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b',
      transactionHash: '0x3',
    };

    const getLogs = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs') as any;
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
      blockHistoryLimit: 600,
      currentBlock: 10716084,
      provider: new ethers.providers.JsonRpcProvider(),
      providerId: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
    };

    const res = await eventLogs.fetch(fetchOptions);
    expect(res).toEqual([
      {
        blockNumber: 10716082,
        parsedLog: { topic: '0xaff6f5e5548953a11cbb1cfdd76562512f969b0eba0a2163f2420630d4dda97b' },
        transactionHash: '0x1',
      },
      {
        blockNumber: 10716083,
        parsedLog: { topic: '0x1bdbe9e5d42a025a741fc3582eb3cad4ef61ac742d83cc87e545fbd481b926b5' },
        transactionHash: '0x2',
      },
      {
        blockNumber: 10716082,
        parsedLog: { topic: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b' },
        transactionHash: '0x3',
      },
    ]);
  });

  it('throws an exception if the logs cannot be fetched', async () => {
    expect.assertions(1);

    const getLogs = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs') as any;
    getLogs.mockRejectedValueOnce(new Error('Unable to fetch logs'));
    getLogs.mockRejectedValueOnce(new Error('Unable to fetch logs'));

    const fetchOptions = {
      address: '0xe60b966B798f9a0C41724f111225A5586ff30656',
      blockHistoryLimit: 600,
      currentBlock: 10716084,
      provider: new ethers.providers.JsonRpcProvider(),
      providerId: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
    };
    try {
      await eventLogs.fetch(fetchOptions);
    } catch (e) {
      expect(e).toEqual(new Error('Unable to fetch logs'));
    }
  });

  it('throws an exception if the logs cannot be parsed', async () => {
    expect.assertions(1);
    const newApiCallEvent = {
      blockNumber: 10716082,
      topic: '0xinvalidtopic',
      transactionHash: '0x1',
    };
    const getLogs = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs') as any;
    getLogs.mockResolvedValueOnce([newApiCallEvent]);

    // TODO: We probably shouldn't be mocking the interface, but need to find
    // a stable way to have the ABI accessible in the tests
    const contractInterface = new ethers.utils.Interface('abi here');
    const parseLog = contractInterface.parseLog as jest.Mock;
    parseLog.mockImplementationOnce(() => {
      throw new Error('Unable to parse topic');
    });

    const fetchOptions = {
      address: '0xe60b966B798f9a0C41724f111225A5586ff30656',
      blockHistoryLimit: 600,
      currentBlock: 10716084,
      provider: new ethers.providers.JsonRpcProvider(),
      providerId: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
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
        parsedLog: { topic: '0xaff6f5e5548953a11cbb1cfdd76562512f969b0eba0a2163f2420630d4dda97b' },
        transactionHash: '0x1',
      },
      {
        blockNumber: 10716083,
        parsedLog: { topic: '0x1bdbe9e5d42a025a741fc3582eb3cad4ef61ac742d83cc87e545fbd481b926b5' },
        transactionHash: '0x2',
      },
      // Unknown event
      {
        blockNumber: 10716082,
        parsedLog: { topic: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b' },
        transactionHash: '0x3',
      },
    ];

    const res = eventLogs.group(logsWithMetadata);
    expect(res).toEqual({
      apiCalls: [
        {
          blockNumber: 10716082,
          parsedLog: { topic: '0xaff6f5e5548953a11cbb1cfdd76562512f969b0eba0a2163f2420630d4dda97b' },
          transactionHash: '0x1',
        },
        {
          blockNumber: 10716083,
          parsedLog: { topic: '0x1bdbe9e5d42a025a741fc3582eb3cad4ef61ac742d83cc87e545fbd481b926b5' },
          transactionHash: '0x2',
        },
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
      },
    ];

    const res = eventLogs.group(logsWithMetadata);
    expect(res).toEqual({
      apiCalls: [],
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
        },
      ],
    });
  });
});
