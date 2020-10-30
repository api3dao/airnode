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

jest.mock('../config', () => ({
  security: {
    masterKeyMnemonic: 'bracket simple lock network census onion spy real spread pig hawk lonely',
  },
}));

import { ethers } from 'ethers';
import * as providers from './providers';

describe('findWithBlock', () => {
  const options = {
    adminAddress: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
    airnodeAddress: '0xe60b966B798f9a0C41724f111225A5586ff30656',
    convenienceAddress: '0xD5659F26A72A8D718d1955C42B3AE418edB001e0',
    provider: new ethers.providers.JsonRpcProvider(),
    providerId: '0xproviderId',
  };

  it('returns the admin address, xpub and current block number', async () => {
    getProviderAndBlockNumberMock.mockResolvedValueOnce({
      admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      blockNumber: ethers.BigNumber.from('12'),
      xpub:
        'xpub661MyMwAqRbcF9ehXsbUTRmxvQFAJ35VCUqyGHPiJ1L1mtHm8pkDeUPsmLPVLLfY61nkFcHiBNeAYm9V3MLfveemc8SWwH2jqQzG6qdgqoH',
    });
    const [logs, res] = await providers.findWithBlock(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Fetching current block and provider admin details...' },
      { level: 'INFO', message: 'Current block:12' },
      { level: 'INFO', message: 'Admin address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410' },
      {
        level: 'INFO',
        message:
          'Provider extended public key:xpub661MyMwAqRbcF9ehXsbUTRmxvQFAJ35VCUqyGHPiJ1L1mtHm8pkDeUPsmLPVLLfY61nkFcHiBNeAYm9V3MLfveemc8SWwH2jqQzG6qdgqoH',
      },
    ]);
    expect(res).toEqual({
      adminAddress: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      blockNumber: 12,
      providerExists: true,
      xpub:
        'xpub661MyMwAqRbcF9ehXsbUTRmxvQFAJ35VCUqyGHPiJ1L1mtHm8pkDeUPsmLPVLLfY61nkFcHiBNeAYm9V3MLfveemc8SWwH2jqQzG6qdgqoH',
    });
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledTimes(1);
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledWith('0xproviderId');
  });

  it('checks that the extended public key exists', async () => {
    getProviderAndBlockNumberMock.mockResolvedValueOnce({
      admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      blockNumber: ethers.BigNumber.from('12'),
      xpub: '',
    });
    const [logs, res] = await providers.findWithBlock(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Fetching current block and provider admin details...' },
      { level: 'INFO', message: 'Current block:12' },
      { level: 'INFO', message: 'Provider not found' },
    ]);
    expect(res).toEqual({
      adminAddress: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      blockNumber: 12,
      providerExists: false,
      xpub: '',
    });
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledTimes(1);
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledWith('0xproviderId');
  });

  it('retries once on failure', async () => {
    getProviderAndBlockNumberMock.mockRejectedValueOnce(new Error('Server says no'));
    getProviderAndBlockNumberMock.mockResolvedValueOnce({
      admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      blockNumber: ethers.BigNumber.from('12'),
      xpub:
        'xpub661MyMwAqRbcF9ehXsbUTRmxvQFAJ35VCUqyGHPiJ1L1mtHm8pkDeUPsmLPVLLfY61nkFcHiBNeAYm9V3MLfveemc8SWwH2jqQzG6qdgqoH',
    });
    const [logs, res] = await providers.findWithBlock(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Fetching current block and provider admin details...' },
      { level: 'INFO', message: 'Current block:12' },
      { level: 'INFO', message: 'Admin address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410' },
      {
        level: 'INFO',
        message:
          'Provider extended public key:xpub661MyMwAqRbcF9ehXsbUTRmxvQFAJ35VCUqyGHPiJ1L1mtHm8pkDeUPsmLPVLLfY61nkFcHiBNeAYm9V3MLfveemc8SWwH2jqQzG6qdgqoH',
      },
    ]);
    expect(res).toEqual({
      adminAddress: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      blockNumber: 12,
      providerExists: true,
      xpub:
        'xpub661MyMwAqRbcF9ehXsbUTRmxvQFAJ35VCUqyGHPiJ1L1mtHm8pkDeUPsmLPVLLfY61nkFcHiBNeAYm9V3MLfveemc8SWwH2jqQzG6qdgqoH',
    });
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledTimes(2);
    expect(getProviderAndBlockNumberMock.mock.calls).toEqual([['0xproviderId'], ['0xproviderId']]);
  });

  it('returns null if the retries are exhausted', async () => {
    getProviderAndBlockNumberMock.mockRejectedValueOnce(new Error('Server says no'));
    getProviderAndBlockNumberMock.mockRejectedValueOnce(new Error('Server says no'));
    const [logs, res] = await providers.findWithBlock(options);
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
    expect(getProviderAndBlockNumberMock.mock.calls).toEqual([['0xproviderId'], ['0xproviderId']]);
  });
});

describe('create', () => {
  const options = {
    adminAddress: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
    airnodeAddress: '0xe60b966B798f9a0C41724f111225A5586ff30656',
    convenienceAddress: '0xD5659F26A72A8D718d1955C42B3AE418edB001e0',
    provider: new ethers.providers.JsonRpcProvider(),
    xpub:
      'xpub661MyMwAqRbcF9ehXsbUTRmxvQFAJ35VCUqyGHPiJ1L1mtHm8pkDeUPsmLPVLLfY61nkFcHiBNeAYm9V3MLfveemc8SWwH2jqQzG6qdgqoH',
  };

  it('creates the provider and returns the transaction', async () => {
    createProviderMock.mockResolvedValueOnce({ hash: '0xsuccessful' });
    const [logs, res] = await providers.create(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Creating provider with address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410...' },
      { level: 'INFO', message: 'Create provider transaction submitted:0xsuccessful' },
    ]);
    expect(res).toEqual({ hash: '0xsuccessful' });
    expect(createProviderMock).toHaveBeenCalledTimes(1);
    expect(createProviderMock).toHaveBeenCalledWith(
      '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      'xpub661MyMwAqRbcF9ehXsbUTRmxvQFAJ35VCUqyGHPiJ1L1mtHm8pkDeUPsmLPVLLfY61nkFcHiBNeAYm9V3MLfveemc8SWwH2jqQzG6qdgqoH'
    );
  });

  it('returns an error if a null is returned', async () => {
    createProviderMock.mockResolvedValueOnce(null);
    const [logs, res] = await providers.create(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Creating provider with address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410...' },
      { level: 'ERROR', message: 'Unable to create provider' },
    ]);
    expect(res).toEqual(null);
    expect(createProviderMock).toHaveBeenCalledTimes(1);
    expect(createProviderMock).toHaveBeenCalledWith(
      '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      'xpub661MyMwAqRbcF9ehXsbUTRmxvQFAJ35VCUqyGHPiJ1L1mtHm8pkDeUPsmLPVLLfY61nkFcHiBNeAYm9V3MLfveemc8SWwH2jqQzG6qdgqoH'
    );
  });

  it('retries once on failure', async () => {
    createProviderMock.mockRejectedValueOnce(new Error('Server says no'));
    createProviderMock.mockResolvedValueOnce({ hash: '0xsuccessful' });
    const [logs, res] = await providers.create(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Creating provider with address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410...' },
      { level: 'INFO', message: 'Create provider transaction submitted:0xsuccessful' },
    ]);
    expect(res).toEqual({ hash: '0xsuccessful' });
    expect(createProviderMock).toHaveBeenCalledTimes(2);
  });

  it('returns null if the retries are exhausted', async () => {
    createProviderMock.mockRejectedValueOnce(new Error('Server says no'));
    createProviderMock.mockRejectedValueOnce(new Error('Server says no'));
    const [logs, res] = await providers.create(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Creating provider with address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410...' },
      { level: 'ERROR', message: 'Unable to create provider', error: new Error('Server says no') },
    ]);
    expect(res).toEqual(null);
    expect(createProviderMock).toHaveBeenCalledTimes(2);
  });
});

describe('findOrCreateProviderWithBlock', () => {
  const options = {
    adminAddress: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
    airnodeAddress: '0xe60b966B798f9a0C41724f111225A5586ff30656',
    convenienceAddress: '0xD5659F26A72A8D718d1955C42B3AE418edB001e0',
    provider: new ethers.providers.JsonRpcProvider(),
  };

  it('returns nothing if it fails to get the provider and block data', async () => {
    getProviderAndBlockNumberMock.mockRejectedValueOnce(new Error('Server says no'));
    getProviderAndBlockNumberMock.mockRejectedValueOnce(new Error('Server says no'));
    const [logs, res] = await providers.findOrCreateProviderWithBlock(options);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message:
          'Computed provider ID from mnemonic:0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9',
      },
      { level: 'INFO', message: 'Fetching current block and provider admin details...' },
      {
        level: 'ERROR',
        message: 'Unable to fetch current block and provider admin details',
        error: new Error('Server says no'),
      },
    ]);
    expect(res).toEqual(null);
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledTimes(2);
    expect(getProviderAndBlockNumberMock.mock.calls).toEqual([
      ['0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9'],
      ['0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9'],
    ]);
  });

  it('creates a provider if xpub if empty and returns the transaction', async () => {
    getProviderAndBlockNumberMock.mockResolvedValueOnce({
      admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      blockNumber: ethers.BigNumber.from('12'),
      xpub: '',
    });
    createProviderMock.mockResolvedValueOnce({ hash: '0xsuccessful' });
    const [logs, res] = await providers.findOrCreateProviderWithBlock(options);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message:
          'Computed provider ID from mnemonic:0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9',
      },
      { level: 'INFO', message: 'Fetching current block and provider admin details...' },
      { level: 'INFO', message: 'Current block:12' },
      { level: 'INFO', message: 'Provider not found' },
      { level: 'INFO', message: 'Creating provider with address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410...' },
      { level: 'INFO', message: 'Create provider transaction submitted:0xsuccessful' },
    ]);
    expect(res).toEqual({
      adminAddress: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      blockNumber: 12,
      providerExists: false,
      xpub: '',
    });
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledTimes(1);
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledWith(
      '0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9'
    );
    expect(createProviderMock).toHaveBeenCalledTimes(1);
    expect(createProviderMock).toHaveBeenCalledWith(
      '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      'xpub661MyMwAqRbcF9ehXsbUTRmxvQFAJ35VCUqyGHPiJ1L1mtHm8pkDeUPsmLPVLLfY61nkFcHiBNeAYm9V3MLfveemc8SWwH2jqQzG6qdgqoH'
    );
  });

  it('returns the provider data and block if the provider already exists', async () => {
    getProviderAndBlockNumberMock.mockResolvedValueOnce({
      admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      blockNumber: ethers.BigNumber.from('12'),
      xpub:
        'xpub661MyMwAqRbcF9ehXsbUTRmxvQFAJ35VCUqyGHPiJ1L1mtHm8pkDeUPsmLPVLLfY61nkFcHiBNeAYm9V3MLfveemc8SWwH2jqQzG6qdgqoH',
    });
    const [logs, res] = await providers.findOrCreateProviderWithBlock(options);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message:
          'Computed provider ID from mnemonic:0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9',
      },
      { level: 'INFO', message: 'Fetching current block and provider admin details...' },
      { level: 'INFO', message: 'Current block:12' },
      { level: 'INFO', message: 'Admin address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410' },
      {
        level: 'INFO',
        message:
          'Provider extended public key:xpub661MyMwAqRbcF9ehXsbUTRmxvQFAJ35VCUqyGHPiJ1L1mtHm8pkDeUPsmLPVLLfY61nkFcHiBNeAYm9V3MLfveemc8SWwH2jqQzG6qdgqoH',
      },
      { level: 'DEBUG', message: 'Skipping provider creation as the provider exists' },
    ]);
    expect(res).toEqual({
      adminAddress: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      blockNumber: 12,
      providerExists: true,
      xpub:
        'xpub661MyMwAqRbcF9ehXsbUTRmxvQFAJ35VCUqyGHPiJ1L1mtHm8pkDeUPsmLPVLLfY61nkFcHiBNeAYm9V3MLfveemc8SWwH2jqQzG6qdgqoH',
    });
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledTimes(1);
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledWith(
      '0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9'
    );
    expect(createProviderMock).not.toHaveBeenCalled();
  });
});
