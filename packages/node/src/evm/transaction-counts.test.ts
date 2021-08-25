import { mockEthers } from '../../test/mock-utils';
const getTransactionCountMock = jest.fn();
mockEthers({
  ethersMocks: {
    providers: {
      JsonRpcProvider: jest.fn().mockImplementation(() => ({
        getTransactionCount: getTransactionCountMock,
      })),
    },
  },
});

import { ethers } from 'ethers';
import * as transactions from './transaction-counts';
import * as wallet from './wallet';
import * as fixtures from '../../test/fixtures';

const config = fixtures.buildConfig();

describe('fetchBySponsor', () => {
  it('calls getTransactionCount once for each unique sponsor', async () => {
    getTransactionCountMock.mockResolvedValueOnce(5);
    const options = {
      currentBlock: 10716084,
      masterHDNode: wallet.getMasterHDNode(config),
      provider: new ethers.providers.JsonRpcProvider(),
    };
    const addresses = ['1', '1']; // TODO: fix value
    const [logs, res] = await transactions.fetchBySponsor(addresses, options);
    expect(logs).toEqual([]);
    expect(res).toEqual({ 1: 5 });
    expect(getTransactionCountMock).toHaveBeenCalledTimes(1);
    expect(getTransactionCountMock).toHaveBeenCalledWith('0x34e9A78D63c9ca2148C95e880c6B1F48AE7F121E', 10716084);
  });

  it('returns transaction counts for multiple wallets', async () => {
    getTransactionCountMock.mockResolvedValueOnce(45);
    getTransactionCountMock.mockResolvedValueOnce(123);
    const options = {
      currentBlock: 10716084,
      masterHDNode: wallet.getMasterHDNode(config),
      provider: new ethers.providers.JsonRpcProvider(),
    };
    const addresses = ['1', '2']; // TODO: fix value
    const [logs, res] = await transactions.fetchBySponsor(addresses, options);
    expect(logs).toEqual([]);
    expect(res).toEqual({ 1: 45, 2: 123 });
    expect(getTransactionCountMock).toHaveBeenCalledTimes(2);
    expect(getTransactionCountMock.mock.calls).toEqual([
      ['0x34e9A78D63c9ca2148C95e880c6B1F48AE7F121E', 10716084],
      ['0xa46c4b41d72Ada9D14157b28A8a2Db97560fFF12', 10716084],
    ]);
  });

  it('retries once on failure', async () => {
    getTransactionCountMock.mockRejectedValueOnce(new Error('Server says no'));
    getTransactionCountMock.mockResolvedValueOnce(123);
    const options = {
      currentBlock: 10716084,
      masterHDNode: wallet.getMasterHDNode(config),
      provider: new ethers.providers.JsonRpcProvider(),
    };
    const addresses = ['1', '1']; // TODO: fix value
    const [logs, res] = await transactions.fetchBySponsor(addresses, options);
    expect(logs).toEqual([]);
    expect(res).toEqual({ 1: 123 });
    expect(getTransactionCountMock).toHaveBeenCalledTimes(2);
    expect(getTransactionCountMock.mock.calls).toEqual([
      ['0x34e9A78D63c9ca2148C95e880c6B1F48AE7F121E', 10716084],
      ['0x34e9A78D63c9ca2148C95e880c6B1F48AE7F121E', 10716084],
    ]);
  });

  it('retries a maximum of two times', async () => {
    getTransactionCountMock.mockRejectedValueOnce(new Error('Server says no'));
    getTransactionCountMock.mockRejectedValueOnce(new Error('Server says no'));
    const options = {
      currentBlock: 10716084,
      masterHDNode: wallet.getMasterHDNode(config),
      provider: new ethers.providers.JsonRpcProvider(),
    };
    const addresses = ['1', '1']; // TODO: fix value
    const [logs, res] = await transactions.fetchBySponsor(addresses, options);
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: 'Unable to fetch transaction count for wallet:0x34e9A78D63c9ca2148C95e880c6B1F48AE7F121E',
        error: new Error('Server says no'),
      },
    ]);
    expect(res).toEqual({});
    expect(getTransactionCountMock).toHaveBeenCalledTimes(2);
  });
});
