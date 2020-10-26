const getProviderAndBlockNumberMock = jest.fn();
const createProviderMock = jest.fn();
jest.mock('ethers', () => ({
  ethers: {
    ...jest.requireActual('ethers'),
    Contract: jest.fn().mockImplementation(() => ({
      createProvider: createProviderMock,
      getProviderAndBlockNumber: getProviderAndBlockNumberMock,
    })),
  },
}));

import { ethers } from 'ethers';
import * as providers from './providers';

describe('getProviderAndBlockNumber', () => {
  const options = {
    airnodeAddress: '0xe60b966B798f9a0C41724f111225A5586ff30656',
    convenienceAddress: '0xD5659F26A72A8D718d1955C42B3AE418edB001e0',
    provider: new ethers.providers.JsonRpcProvider(),
    providerId: '0xproviderId',
  };

  it('returns the admin address, xpub and current block number', async () => {
    getProviderAndBlockNumberMock.mockResolvedValueOnce({
      admin: '0xadminAddress',
      blockNumber: ethers.BigNumber.from('12'),
      xpub: '0xxpub',
    });
    const [logs, res] = await providers.getProviderAndBlockNumber(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Fetching current block and provider admin details...' },
      { level: 'INFO', message: 'Admin address: 0xadminAddress' },
      { level: 'INFO', message: 'Admin extended public key: 0xxpub' },
      { level: 'INFO', message: 'Current block: 12' },
    ]);
    expect(res).toEqual({ adminAddress: '0xadminAddress', blockNumber: 12, xpub: '0xxpub' });
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledTimes(1);
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledWith('0xproviderId');
  });

  it('retries once on failure', async () => {
    getProviderAndBlockNumberMock.mockRejectedValueOnce(new Error('Server says no'));
    getProviderAndBlockNumberMock.mockResolvedValueOnce({
      admin: '0xadminAddress',
      blockNumber: ethers.BigNumber.from('12'),
      xpub: '0xxpub',
    });
    const [logs, res] = await providers.getProviderAndBlockNumber(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Fetching current block and provider admin details...' },
      { level: 'INFO', message: 'Admin address: 0xadminAddress' },
      { level: 'INFO', message: 'Admin extended public key: 0xxpub' },
      { level: 'INFO', message: 'Current block: 12' },
    ]);
    expect(res).toEqual({ adminAddress: '0xadminAddress', blockNumber: 12, xpub: '0xxpub' });
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledTimes(2);
  });

  it('returns null if the retries are exhausted', async () => {
    getProviderAndBlockNumberMock.mockRejectedValueOnce(new Error('Server says no'));
    getProviderAndBlockNumberMock.mockRejectedValueOnce(new Error('Server says no'));
    // Won't be reached
    getProviderAndBlockNumberMock.mockResolvedValueOnce({ admin: '0xadminAddress' });
    const [logs, res] = await providers.getProviderAndBlockNumber(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Fetching current block and provider admin details...' },
      {
        level: 'ERROR',
        message: 'Unable to fetch current block and provider admin details',
        error: new Error('Server says no'),
      },
    ]);
    expect(res).toEqual(null);
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledTimes(2);
  });
});

describe('create', () => {
  const options = {
    adminAddress: '0xadminAddress',
    airnodeAddress: '0xe60b966B798f9a0C41724f111225A5586ff30656',
    convenienceAddress: '0xD5659F26A72A8D718d1955C42B3AE418edB001e0',
    provider: new ethers.providers.JsonRpcProvider(),
    xpub: '0xxpub',
  };

  it('creates the provider and returns the transaction', async () => {
    createProviderMock.mockResolvedValueOnce({ hash: '0xsuccessful' });
    const [logs, res] = await providers.create(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Creating provider with address:0xadminAddress...' },
      { level: 'INFO', message: 'Create provider transaction submitted: 0xsuccessful' },
    ]);
    expect(res).toEqual({ hash: '0xsuccessful' });
    expect(createProviderMock).toHaveBeenCalledTimes(1);
    expect(createProviderMock).toHaveBeenCalledWith('0xadminAddress', '0xxpub');
  });

  it('returns an error if a null is returned', async () => {
    createProviderMock.mockResolvedValueOnce(null);
    const [logs, res] = await providers.create(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Creating provider with address:0xadminAddress...' },
      { level: 'ERROR', message: 'Unable to create provider' },
    ]);
    expect(res).toEqual(null);
    expect(createProviderMock).toHaveBeenCalledTimes(1);
    expect(createProviderMock).toHaveBeenCalledWith('0xadminAddress', '0xxpub');
  });

  it('retries once on failure', async () => {
    createProviderMock.mockRejectedValueOnce(new Error('Server says no'));
    createProviderMock.mockResolvedValueOnce({ hash: '0xsuccessful' });
    const [logs, res] = await providers.create(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Creating provider with address:0xadminAddress...' },
      { level: 'INFO', message: 'Create provider transaction submitted: 0xsuccessful' },
    ]);
    expect(res).toEqual({ hash: '0xsuccessful' });
    expect(createProviderMock).toHaveBeenCalledTimes(2);
  });

  it('returns null if the retries are exhausted', async () => {
    createProviderMock.mockRejectedValueOnce(new Error('Server says no'));
    createProviderMock.mockRejectedValueOnce(new Error('Server says no'));
    // Won't be reached
    createProviderMock.mockResolvedValueOnce({ hash: '0xsuccessful' });
    const [logs, res] = await providers.create(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Creating provider with address:0xadminAddress...' },
      { level: 'ERROR', message: 'Unable to create provider', error: new Error('Server says no') },
    ]);
    expect(res).toEqual(null);
    expect(createProviderMock).toHaveBeenCalledTimes(2);
  });
});
