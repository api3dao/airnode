const getTransactionCountMock = jest.fn();
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ethers: {
      ...original,
      providers: {
        JsonRpcProvider: jest.fn().mockImplementation(() => ({
          getTransactionCount: getTransactionCountMock,
        })),
      },
    },
  };
});

import { ethers } from 'ethers';
import * as transactions from './transaction-counts';

describe('getTransactionCountByIndex', () => {
  it('calls getTransactionCount once for each unique wallet index', async () => {
    getTransactionCountMock.mockResolvedValueOnce(5);

    const options = {
      currentBlock: 10716084,
      provider: new ethers.providers.JsonRpcProvider(),
    };
    const addresses = ['0x3128982694c63a803dd98ea6fbd887770b78bb6d', '0x3128982694c63a803dd98ea6fbd887770b78bb6d'];

    const [logs, res] = await transactions.fetchByAddress(addresses, options);
    expect(logs).toEqual([]);
    expect(res).toEqual({ '0x3128982694c63a803dd98ea6fbd887770b78bb6d': 5 });
    expect(getTransactionCountMock).toHaveBeenCalledTimes(1);
    expect(getTransactionCountMock).toHaveBeenCalledWith('0x3128982694c63a803dd98ea6fbd887770b78bb6d', 10716084);
  });

  it('returns transaction counts for multiple wallets', async () => {
    getTransactionCountMock.mockResolvedValueOnce(45);
    getTransactionCountMock.mockResolvedValueOnce(123);

    const options = {
      currentBlock: 10716084,
      provider: new ethers.providers.JsonRpcProvider(),
    };
    const addresses = ['0x3128982694c63a803dd98ea6fbd887770b78bb6d', '0xbd09b2a7cbaa4b32338c9eb47f0738eb57ab423c'];

    const [logs, res] = await transactions.fetchByAddress(addresses, options);
    expect(logs).toEqual([]);
    expect(res).toEqual({
      '0x3128982694c63a803dd98ea6fbd887770b78bb6d': 45,
      '0xbd09b2a7cbaa4b32338c9eb47f0738eb57ab423c': 123,
    });
    expect(getTransactionCountMock).toHaveBeenCalledTimes(2);
    expect(getTransactionCountMock.mock.calls).toEqual([
      ['0x3128982694c63a803dd98ea6fbd887770b78bb6d', 10716084],
      ['0xbd09b2a7cbaa4b32338c9eb47f0738eb57ab423c', 10716084],
    ]);
  });

  it('retries once on failure', async () => {
    getTransactionCountMock.mockRejectedValueOnce(new Error('Server says no'));
    getTransactionCountMock.mockResolvedValueOnce(123);

    const options = {
      currentBlock: 10716084,
      provider: new ethers.providers.JsonRpcProvider(),
    };
    const addresses = ['0x3128982694c63a803dd98ea6fbd887770b78bb6d'];

    const [logs, res] = await transactions.fetchByAddress(addresses, options);
    expect(logs).toEqual([]);
    expect(res).toEqual({ '0x3128982694c63a803dd98ea6fbd887770b78bb6d': 123 });
    expect(getTransactionCountMock).toHaveBeenCalledTimes(2);
    expect(getTransactionCountMock.mock.calls).toEqual([
      ['0x3128982694c63a803dd98ea6fbd887770b78bb6d', 10716084],
      ['0x3128982694c63a803dd98ea6fbd887770b78bb6d', 10716084],
    ]);
  });

  it('retries a maximum of two times', async () => {
    getTransactionCountMock.mockRejectedValueOnce(new Error('Server says no'));
    getTransactionCountMock.mockRejectedValueOnce(new Error('Server says no'));
    getTransactionCountMock.mockResolvedValueOnce(123);

    const options = {
      currentBlock: 10716084,
      provider: new ethers.providers.JsonRpcProvider(),
    };
    const addresses = ['0x3128982694c63a803dd98ea6fbd887770b78bb6d'];

    const [logs, res] = await transactions.fetchByAddress(addresses, options);
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: 'Unable to fetch transaction count for wallet:0x3128982694c63a803dd98ea6fbd887770b78bb6d',
        error: new Error('Server says no'),
      },
    ]);
    expect(res).toEqual({});
    expect(getTransactionCountMock).toHaveBeenCalledTimes(2);
  });
});
