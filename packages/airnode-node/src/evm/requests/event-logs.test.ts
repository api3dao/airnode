import { mockEthers } from '../../../test/mock-utils';
const parseLogMock = jest.fn();
const original = jest.requireActual('ethers');
mockEthers({
  ethersMocks: {
    utils: {
      ...original.utils,
      Interface: jest.fn().mockImplementation(() => ({
        parseLog: parseLogMock,
      })),
    },
  },
});

import { ethers } from 'ethers';
import { removeKeys } from '@api3/airnode-utilities';
import * as eventLogs from './event-logs';

describe('EVM event logs - fetch', () => {
  it('returns all logs with metadata', async () => {
    const newApiCallEvent = {
      blockNumber: 10716082,
      topic: '0xeb39930cdcbb560e6422558a2468b93a215af60063622e63cbb165eba14c3203',
      transactionHash: '0x1',
      logIndex: 0,
    };
    const fulfilledApiCallEvent = {
      blockNumber: 10716083,
      topic: '0x1bdbe9e5d42a025a741fc3582eb3cad4ef61ac742d83cc87e545fbd481b926b5',
      transactionHash: '0x2',
      logIndex: 0,
    };
    const unknownEvent = {
      blockNumber: 10716082,
      topic: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b',
      transactionHash: '0x3',
      logIndex: 1,
    };

    const getLogs = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs') as any;
    getLogs.mockResolvedValueOnce([newApiCallEvent, fulfilledApiCallEvent, unknownEvent]);

    // TODO: We probably shouldn't be mocking the interface, but need to find
    // a stable way to have the ABI accessible in the tests
    const contractInterface = new ethers.utils.Interface('abi here');
    const parseLog = contractInterface.parseLog as jest.Mock;
    parseLog.mockReturnValueOnce(removeKeys(newApiCallEvent, ['blockNumber', 'transactionHash', 'logIndex']));
    parseLog.mockReturnValueOnce(removeKeys(fulfilledApiCallEvent, ['blockNumber', 'transactionHash', 'logIndex']));
    parseLog.mockReturnValueOnce(removeKeys(unknownEvent, ['blockNumber', 'transactionHash', 'logIndex']));

    const fetchOptions = {
      address: '0xe60b966B798f9a0C41724f111225A5586ff30656',
      airnodeAddress: '0xa30ca71ba54e83127214d3271aea8f5d6bd4dace',
      blockHistoryLimit: 300,
      currentBlock: 10716084,
      minConfirmations: 1,
      mayOverrideMinConfirmations: false,
      provider: new ethers.providers.JsonRpcProvider(),
      chainId: '31137',
    };

    const res = await eventLogs.fetch(fetchOptions);
    expect(res).toEqual([
      {
        blockNumber: 10716082,
        currentBlock: 10716084,
        minConfirmations: 1,
        parsedLog: { topic: '0xeb39930cdcbb560e6422558a2468b93a215af60063622e63cbb165eba14c3203' },
        transactionHash: '0x1',
        logIndex: 0,
        chainId: '31137',
      },
      {
        blockNumber: 10716083,
        currentBlock: 10716084,
        minConfirmations: 1,
        parsedLog: { topic: '0x1bdbe9e5d42a025a741fc3582eb3cad4ef61ac742d83cc87e545fbd481b926b5' },
        transactionHash: '0x2',
        logIndex: 0,
        chainId: '31137',
      },
      {
        blockNumber: 10716082,
        currentBlock: 10716084,
        minConfirmations: 1,
        parsedLog: { topic: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b' },
        transactionHash: '0x3',
        logIndex: 1,
        chainId: '31137',
      },
    ]);
    expect(getLogs).toHaveBeenCalledTimes(1);
    expect(getLogs).toHaveBeenCalledWith({
      // fromBlock: 10716084 - 300
      // toBlock: 10716084 - 1
      fromBlock: 10715784,
      toBlock: 10716083,
      address: '0xe60b966B798f9a0C41724f111225A5586ff30656',
      topics: [null, '0x000000000000000000000000a30ca71ba54e83127214d3271aea8f5d6bd4dace'],
    });
  });

  it('throws an exception if the logs cannot be fetched', async () => {
    const getLogs = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs') as any;
    getLogs.mockRejectedValueOnce(new Error('Unable to fetch logs'));

    const fetchOptions = {
      address: '0xe60b966B798f9a0C41724f111225A5586ff30656',
      airnodeAddress: '0xa30ca71ba54e83127214d3271aea8f5d6bd4dace',
      blockHistoryLimit: 30,
      currentBlock: 10716084,
      minConfirmations: 0,
      mayOverrideMinConfirmations: false,
      provider: new ethers.providers.JsonRpcProvider(),
      chainId: '31137',
    };
    await expect(eventLogs.fetch(fetchOptions)).rejects.toThrow(new Error('Unable to fetch logs'));
  });

  it('throws an exception if the logs cannot be parsed', async () => {
    const newApiCallEvent = {
      blockNumber: 10716082,
      topic: '0xinvalidtopic',
      transactionHash: '0x1',
      logIndex: 0,
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
      airnodeAddress: '0xa30ca71ba54e83127214d3271aea8f5d6bd4dace',
      blockHistoryLimit: 300,
      currentBlock: 10716084,
      minConfirmations: 0,
      mayOverrideMinConfirmations: false,
      provider: new ethers.providers.JsonRpcProvider(),
      chainId: '31137',
    };
    await expect(eventLogs.fetch(fetchOptions)).rejects.toThrow(new Error('Unable to parse topic'));
  });

  it('protects against negative fromBlock', async () => {
    const getLogs = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs') as any;
    getLogs.mockResolvedValueOnce([]);
    const fetchOptions = {
      address: '0xe60b966B798f9a0C41724f111225A5586ff30656',
      airnodeAddress: '0xa30ca71ba54e83127214d3271aea8f5d6bd4dace',
      blockHistoryLimit: 99999999,
      currentBlock: 10716084,
      minConfirmations: 10,
      mayOverrideMinConfirmations: false,
      provider: new ethers.providers.JsonRpcProvider(),
      chainId: '31137',
    };
    const res = await eventLogs.fetch(fetchOptions);
    expect(res).toEqual([]);
    expect(getLogs).toHaveBeenCalledTimes(1);
    expect(getLogs).toHaveBeenCalledWith({
      fromBlock: 0,
      toBlock: 10716074,
      address: '0xe60b966B798f9a0C41724f111225A5586ff30656',
      topics: [null, '0x000000000000000000000000a30ca71ba54e83127214d3271aea8f5d6bd4dace'],
    });
  });

  it('protects against toBlock lower than fromBlock', async () => {
    const getLogs = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs') as any;
    getLogs.mockResolvedValueOnce([]);
    const fetchOptions = {
      address: '0xe60b966B798f9a0C41724f111225A5586ff30656',
      airnodeAddress: '0xa30ca71ba54e83127214d3271aea8f5d6bd4dace',
      blockHistoryLimit: 30,
      currentBlock: 10716084,
      minConfirmations: 99999999,
      mayOverrideMinConfirmations: false,
      provider: new ethers.providers.JsonRpcProvider(),
      chainId: '31137',
    };
    const res = await eventLogs.fetch(fetchOptions);
    expect(res).toEqual([]);
    expect(getLogs).toHaveBeenCalledTimes(1);
    expect(getLogs).toHaveBeenCalledWith({
      fromBlock: 10716054,
      toBlock: 10716054,
      address: '0xe60b966B798f9a0C41724f111225A5586ff30656',
      topics: [null, '0x000000000000000000000000a30ca71ba54e83127214d3271aea8f5d6bd4dace'],
    });
  });
});

describe('EVM event logs - group', () => {
  it('groups apiCall requests and fulfillments', () => {
    const logsWithMetadata: any = [
      // Request
      {
        blockNumber: 10716082,
        parsedLog: { topic: '0xeb39930cdcbb560e6422558a2468b93a215af60063622e63cbb165eba14c3203' },
        transactionHash: '0x1',
        logIndex: 0,
        chainId: '31137',
      },
      // Fulfillment
      {
        blockNumber: 10716083,
        parsedLog: { topic: '0xc0977dab79883641ece94bb6a932ca83049f561ffff8d8daaeafdbc1acce9e0a' },
        transactionHash: '0x2',
        logIndex: 0,
        chainId: '31137',
      },
      // Unknown event
      {
        blockNumber: 10716082,
        parsedLog: { topic: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b' },
        transactionHash: '0x3',
        logIndex: 1,
        chainId: '31137',
      },
    ];

    const res = eventLogs.group(logsWithMetadata);
    expect(res).toEqual({
      apiCalls: [
        {
          blockNumber: 10716082,
          parsedLog: { topic: '0xeb39930cdcbb560e6422558a2468b93a215af60063622e63cbb165eba14c3203' },
          transactionHash: '0x1',
          logIndex: 0,
          chainId: '31137',
        },
        {
          blockNumber: 10716083,
          parsedLog: { topic: '0xc0977dab79883641ece94bb6a932ca83049f561ffff8d8daaeafdbc1acce9e0a' },
          transactionHash: '0x2',
          logIndex: 0,
          chainId: '31137',
        },
      ],
      withdrawals: [],
    });
  });

  it('groups withdrawal requests and fulfillments', () => {
    const logsWithMetadata: any = [
      {
        blockNumber: 10716082,
        parsedLog: { topic: '0xd48d52c7c6d0c940f3f8d07591e1800ef3a70daf79929a97ccd80b4494769fc7' },
        transactionHash: '0x1',
        logIndex: 0,
        chainId: '31137',
      },
      {
        blockNumber: 10716083,
        parsedLog: { topic: '0xadb4840bbd5f924665ae7e0e0c83de5c0fb40a98c9b57dba53a6c978127a622e' },
        transactionHash: '0x2',
        logIndex: 0,
        chainId: '31137',
      },
      // Unknown event
      {
        blockNumber: 10716082,
        parsedLog: { topic: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b' },
        transactionHash: '0x3',
        logIndex: 1,
        chainId: '31137',
      },
    ];

    const res = eventLogs.group(logsWithMetadata);
    expect(res).toEqual({
      apiCalls: [],
      withdrawals: [
        {
          blockNumber: 10716082,
          parsedLog: { topic: '0xd48d52c7c6d0c940f3f8d07591e1800ef3a70daf79929a97ccd80b4494769fc7' },
          transactionHash: '0x1',
          logIndex: 0,
          chainId: '31137',
        },
        {
          blockNumber: 10716083,
          parsedLog: { topic: '0xadb4840bbd5f924665ae7e0e0c83de5c0fb40a98c9b57dba53a6c978127a622e' },
          transactionHash: '0x2',
          logIndex: 0,
          chainId: '31137',
        },
      ],
    });
  });
});
