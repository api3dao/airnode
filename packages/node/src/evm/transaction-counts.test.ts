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
    const addresses = ['0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181', '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181'];
    const [logs, res] = await transactions.fetchBySponsor(addresses, options);
    expect(logs).toEqual([]);
    expect(res).toEqual({ '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181': 5 });
    expect(getTransactionCountMock).toHaveBeenCalledTimes(1);
    expect(getTransactionCountMock).toHaveBeenCalledWith('0x15c2D488bE806Ee769078Cceec00E57a9f2009E1', 10716084);
  });

  it('returns transaction counts for multiple wallets', async () => {
    getTransactionCountMock.mockResolvedValueOnce(45);
    getTransactionCountMock.mockResolvedValueOnce(123);
    const options = {
      currentBlock: 10716084,
      masterHDNode: wallet.getMasterHDNode(config),
      provider: new ethers.providers.JsonRpcProvider(),
    };
    const addresses = ['0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181', '0x99bd3a5A045066F1CEf37A0A952DFa87Af9D898E'];
    const [logs, res] = await transactions.fetchBySponsor(addresses, options);
    expect(logs).toEqual([]);
    expect(res).toEqual({
      '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181': 45,
      '0x99bd3a5A045066F1CEf37A0A952DFa87Af9D898E': 123,
    });
    expect(getTransactionCountMock).toHaveBeenCalledTimes(2);
    expect(getTransactionCountMock.mock.calls).toEqual([
      ['0x15c2D488bE806Ee769078Cceec00E57a9f2009E1', 10716084],
      ['0xfD63156337539030025B0D3f57479a346553172c', 10716084],
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
    const addresses = ['0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181', '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181'];
    const [logs, res] = await transactions.fetchBySponsor(addresses, options);
    expect(logs).toEqual([]);
    expect(res).toEqual({ '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181': 123 });
    expect(getTransactionCountMock).toHaveBeenCalledTimes(2);
    expect(getTransactionCountMock.mock.calls).toEqual([
      ['0x15c2D488bE806Ee769078Cceec00E57a9f2009E1', 10716084],
      ['0x15c2D488bE806Ee769078Cceec00E57a9f2009E1', 10716084],
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
    const addresses = ['0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181', '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181'];
    const [logs, res] = await transactions.fetchBySponsor(addresses, options);
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: 'Unable to fetch transaction count for wallet:0x15c2D488bE806Ee769078Cceec00E57a9f2009E1',
        error: new Error('Server says no'),
      },
    ]);
    expect(res).toEqual({});
    expect(getTransactionCountMock).toHaveBeenCalledTimes(2);
  });
});
