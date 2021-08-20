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
import * as eventLogs from './event-logs';
import { removeKeys } from '../../utils/object-utils';

describe('EVM event logs - fetch', () => {
  it('returns all logs with metadata', async () => {
    const newApiCallEvent = {
      blockNumber: 10716082,
      topic: '0x8339fddbb81e588a9ed04dec82ee9ae6c7a185f44835adaaa2ace50ce3a14aaf',
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
      airnodeAddress: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
      blockHistoryLimit: 300,
      currentBlock: 10716084,
      ignoreBlockedRequestsAfterBlocks: 20,
      provider: new ethers.providers.JsonRpcProvider(),
    };

    const res = await eventLogs.fetch(fetchOptions);
    expect(res).toEqual([
      {
        blockNumber: 10716082,
        currentBlock: 10716084,
        ignoreBlockedRequestsAfterBlocks: 20,
        parsedLog: { topic: '0x8339fddbb81e588a9ed04dec82ee9ae6c7a185f44835adaaa2ace50ce3a14aaf' },
        transactionHash: '0x1',
      },
      {
        blockNumber: 10716083,
        currentBlock: 10716084,
        ignoreBlockedRequestsAfterBlocks: 20,
        parsedLog: { topic: '0x1bdbe9e5d42a025a741fc3582eb3cad4ef61ac742d83cc87e545fbd481b926b5' },
        transactionHash: '0x2',
      },
      {
        blockNumber: 10716082,
        currentBlock: 10716084,
        ignoreBlockedRequestsAfterBlocks: 20,
        parsedLog: { topic: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b' },
        transactionHash: '0x3',
      },
    ]);
    expect(getLogs).toHaveBeenCalledTimes(1);
    expect(getLogs).toHaveBeenCalledWith({
      // 10716084 - 300
      fromBlock: 10715784,
      toBlock: 10716084,
      address: '0xe60b966B798f9a0C41724f111225A5586ff30656',
      topics: [null, '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb'],
    });
  });

  it('throws an exception if the logs cannot be fetched', async () => {
    const getLogs = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs') as any;
    getLogs.mockRejectedValueOnce(new Error('Unable to fetch logs'));
    getLogs.mockRejectedValueOnce(new Error('Unable to fetch logs'));

    const fetchOptions = {
      address: '0xe60b966B798f9a0C41724f111225A5586ff30656',
      airnodeAddress: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
      blockHistoryLimit: 30,
      currentBlock: 10716084,
      ignoreBlockedRequestsAfterBlocks: 20,
      provider: new ethers.providers.JsonRpcProvider(),
    };
    await expect(eventLogs.fetch(fetchOptions)).rejects.toThrow(new Error('Unable to fetch logs'));
  });

  it('throws an exception if the logs cannot be parsed', async () => {
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
      airnodeAddress: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
      blockHistoryLimit: 300,
      currentBlock: 10716084,
      ignoreBlockedRequestsAfterBlocks: 20,
      provider: new ethers.providers.JsonRpcProvider(),
    };
    await expect(eventLogs.fetch(fetchOptions)).rejects.toThrow(new Error('Unable to parse topic'));
  });

  it('protects against negative fromBlock values', async () => {
    const getLogs = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs') as any;
    getLogs.mockResolvedValueOnce([]);
    const fetchOptions = {
      address: '0xe60b966B798f9a0C41724f111225A5586ff30656',
      airnodeAddress: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
      blockHistoryLimit: 99999999,
      currentBlock: 10716084,
      ignoreBlockedRequestsAfterBlocks: 20,
      provider: new ethers.providers.JsonRpcProvider(),
    };
    const res = await eventLogs.fetch(fetchOptions);
    expect(res).toEqual([]);
    expect(getLogs).toHaveBeenCalledTimes(1);
    expect(getLogs).toHaveBeenCalledWith({
      fromBlock: 0,
      toBlock: 10716084,
      address: '0xe60b966B798f9a0C41724f111225A5586ff30656',
      topics: [null, '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb'],
    });
  });
});

describe('EVM event logs - group', () => {
  it('groups apiCall requests and fulfillments', () => {
    const logsWithMetadata: any = [
      // Request
      {
        blockNumber: 10716082,
        parsedLog: { topic: '0x8339fddbb81e588a9ed04dec82ee9ae6c7a185f44835adaaa2ace50ce3a14aaf' },
        transactionHash: '0x1',
      },
      // Fulfillment
      {
        blockNumber: 10716083,
        parsedLog: { topic: '0xcde46e28d8d3e348e5f5b4fcc511fe3b1f9b0f549cd8332f0da31802a6f2bf61' },
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
          parsedLog: { topic: '0x8339fddbb81e588a9ed04dec82ee9ae6c7a185f44835adaaa2ace50ce3a14aaf' },
          transactionHash: '0x1',
        },
        {
          blockNumber: 10716083,
          parsedLog: { topic: '0xcde46e28d8d3e348e5f5b4fcc511fe3b1f9b0f549cd8332f0da31802a6f2bf61' },
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
        parsedLog: { topic: '0x3d0ebccb4fc9730699221da0180970852f595ed5c78781346149123cbbe9f1d3' },
        transactionHash: '0x1',
      },
      {
        blockNumber: 10716083,
        parsedLog: { topic: '0x9e7b58b29aa3b972bb0f457499d0dfd00bf23905b0c3358fb864e7120402aefa' },
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
          parsedLog: { topic: '0x3d0ebccb4fc9730699221da0180970852f595ed5c78781346149123cbbe9f1d3' },
          transactionHash: '0x1',
        },
        {
          blockNumber: 10716083,
          parsedLog: { topic: '0x9e7b58b29aa3b972bb0f457499d0dfd00bf23905b0c3358fb864e7120402aefa' },
          transactionHash: '0x2',
        },
      ],
    });
  });
});
