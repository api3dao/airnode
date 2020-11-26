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
import * as wallet from './wallet';

describe('fetchByRequesterIndex', () => {
  it('calls getTransactionCount once for each unique requester index', async () => {
    getTransactionCountMock.mockResolvedValueOnce(5);
    const options = {
      currentBlock: 10716084,
      masterHDNode: wallet.getMasterHDNode(),
      provider: new ethers.providers.JsonRpcProvider(),
    };
    const indices = ['1', '1'];
    const [logs, res] = await transactions.fetchByRequesterIndex(indices, options);
    expect(logs).toEqual([]);
    expect(res).toEqual({ 1: 5 });
    expect(getTransactionCountMock).toHaveBeenCalledTimes(1);
    expect(getTransactionCountMock).toHaveBeenCalledWith('0xBff368EaD703f07fC6C9585e25d9755A47361562', 10716084);
  });

  it('returns transaction counts for multiple wallets', async () => {
    getTransactionCountMock.mockResolvedValueOnce(45);
    getTransactionCountMock.mockResolvedValueOnce(123);
    const options = {
      currentBlock: 10716084,
      masterHDNode: wallet.getMasterHDNode(),
      provider: new ethers.providers.JsonRpcProvider(),
    };
    const indices = ['1', '2'];
    const [logs, res] = await transactions.fetchByRequesterIndex(indices, options);
    expect(logs).toEqual([]);
    expect(res).toEqual({ 1: 45, 2: 123 });
    expect(getTransactionCountMock).toHaveBeenCalledTimes(2);
    expect(getTransactionCountMock.mock.calls).toEqual([
      ['0xBff368EaD703f07fC6C9585e25d9755A47361562', 10716084],
      ['0x6722FC66C05d7092833CC772fD2C00Fdc0f939a6', 10716084],
    ]);
  });

  it('retries once on failure', async () => {
    getTransactionCountMock.mockRejectedValueOnce(new Error('Server says no'));
    getTransactionCountMock.mockResolvedValueOnce(123);
    const options = {
      currentBlock: 10716084,
      masterHDNode: wallet.getMasterHDNode(),
      provider: new ethers.providers.JsonRpcProvider(),
    };
    const indices = ['1', '1'];
    const [logs, res] = await transactions.fetchByRequesterIndex(indices, options);
    expect(logs).toEqual([]);
    expect(res).toEqual({ 1: 123 });
    expect(getTransactionCountMock).toHaveBeenCalledTimes(2);
    expect(getTransactionCountMock.mock.calls).toEqual([
      ['0xBff368EaD703f07fC6C9585e25d9755A47361562', 10716084],
      ['0xBff368EaD703f07fC6C9585e25d9755A47361562', 10716084],
    ]);
  });

  it('retries a maximum of two times', async () => {
    getTransactionCountMock.mockRejectedValueOnce(new Error('Server says no'));
    getTransactionCountMock.mockRejectedValueOnce(new Error('Server says no'));
    const options = {
      currentBlock: 10716084,
      masterHDNode: wallet.getMasterHDNode(),
      provider: new ethers.providers.JsonRpcProvider(),
    };
    const indices = ['1', '1'];
    const [logs, res] = await transactions.fetchByRequesterIndex(indices, options);
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: 'Unable to fetch transaction count for wallet:0xBff368EaD703f07fC6C9585e25d9755A47361562',
        error: new Error('Server says no'),
      },
    ]);
    expect(res).toEqual({});
    expect(getTransactionCountMock).toHaveBeenCalledTimes(2);
  });
});
