const getProviderAndBlockNumberMock = jest.fn();
const createProviderMock = jest.fn();
const estimateCreateProviderMock = jest.fn();
jest.mock('ethers', () => ({
  ethers: {
    ...jest.requireActual('ethers'),
    Contract: jest.fn().mockImplementation(() => ({
      createProvider: createProviderMock,
      estimateGas: {
        createProvider: estimateCreateProviderMock,
      },
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
    adminAddressForCreatingProviderRecord: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
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
      adminAddressForCreatingProviderRecord: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
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
      adminAddressForCreatingProviderRecord: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
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
      adminAddressForCreatingProviderRecord: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
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
    adminAddressForCreatingProviderRecord: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
    airnodeAddress: '0xe60b966B798f9a0C41724f111225A5586ff30656',
    convenienceAddress: '0xD5659F26A72A8D718d1955C42B3AE418edB001e0',
    provider: new ethers.providers.JsonRpcProvider(),
    xpub:
      'xpub661MyMwAqRbcF9ehXsbUTRmxvQFAJ35VCUqyGHPiJ1L1mtHm8pkDeUPsmLPVLLfY61nkFcHiBNeAYm9V3MLfveemc8SWwH2jqQzG6qdgqoH',
  };

  it('creates the provider and returns the transaction', async () => {
    const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
    gasPriceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1000));
    const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
    balanceSpy.mockResolvedValueOnce(ethers.BigNumber.from(250_000_000));
    estimateCreateProviderMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
    createProviderMock.mockResolvedValueOnce({ hash: '0xsuccessful' });
    const [logs, res] = await providers.create(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Creating provider with address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410...' },
      { level: 'INFO', message: 'Estimating transaction cost for creating provider...' },
      { level: 'INFO', message: 'Estimated gas limit: 70000' },
      { level: 'INFO', message: 'Gas price set to 0.000001 Gwei' },
      { level: 'INFO', message: 'Master wallet balance: 0.00000000025 ETH' },
      { level: 'INFO', message: 'Submitting create provider transaction...' },
      { level: 'INFO', message: 'Create provider transaction submitted:0xsuccessful' },
      {
        level: 'INFO',
        message: 'Airnode will not process requests until the create provider transaction has been confirmed',
      },
    ]);
    expect(res).toEqual({ hash: '0xsuccessful' });
    expect(estimateCreateProviderMock).toHaveBeenCalledTimes(1);
    expect(createProviderMock).toHaveBeenCalledTimes(1);
    expect(createProviderMock).toHaveBeenCalledWith(
      '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      'xpub661MyMwAqRbcF9ehXsbUTRmxvQFAJ35VCUqyGHPiJ1L1mtHm8pkDeUPsmLPVLLfY61nkFcHiBNeAYm9V3MLfveemc8SWwH2jqQzG6qdgqoH',
      {
        // 250_000_000 - ((50_000 + 20_000) * 1000)
        value: ethers.BigNumber.from(180_000_000),
        gasPrice: ethers.BigNumber.from(1000),
        gasLimit: ethers.BigNumber.from(70_000),
      }
    );
  });

  it('returns null if the gas limit estimate fails', async () => {
    estimateCreateProviderMock.mockRejectedValueOnce(new Error('Unable to estimate gas limit'));
    const [logs, res] = await providers.create(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Creating provider with address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410...' },
      { level: 'INFO', message: 'Estimating transaction cost for creating provider...' },
      {
        level: 'ERROR',
        message: 'Unable to estimate transaction cost',
        error: new Error('Unable to estimate gas limit'),
      },
    ]);
    expect(res).toEqual(null);
    expect(estimateCreateProviderMock).toHaveBeenCalledTimes(1);
    expect(createProviderMock).not.toHaveBeenCalled();
  });

  it('returns null if the gas price cannot be fetched', async () => {
    const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
    gasPriceSpy.mockRejectedValueOnce(new Error('Failed to fetch gas price'));
    estimateCreateProviderMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
    const [logs, res] = await providers.create(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Creating provider with address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410...' },
      { level: 'INFO', message: 'Estimating transaction cost for creating provider...' },
      { level: 'INFO', message: 'Estimated gas limit: 70000' },
      { level: 'ERROR', message: 'Unable to fetch gas price', error: new Error('Failed to fetch gas price') },
    ]);
    expect(res).toEqual(null);
    expect(estimateCreateProviderMock).toHaveBeenCalledTimes(1);
    expect(createProviderMock).not.toHaveBeenCalled();
  });

  it('returns null if the master wallet balance cannot be fetched', async () => {
    const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
    gasPriceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1000));
    const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
    balanceSpy.mockRejectedValueOnce(new Error('Failed to fetch balance'));
    estimateCreateProviderMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
    const [logs, res] = await providers.create(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Creating provider with address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410...' },
      { level: 'INFO', message: 'Estimating transaction cost for creating provider...' },
      { level: 'INFO', message: 'Estimated gas limit: 70000' },
      { level: 'INFO', message: 'Gas price set to 0.000001 Gwei' },
      { level: 'ERROR', message: 'Unable to fetch master wallet balance', error: new Error('Failed to fetch balance') },
    ]);
    expect(res).toEqual(null);
    expect(estimateCreateProviderMock).toHaveBeenCalledTimes(1);
    expect(createProviderMock).not.toHaveBeenCalled();
  });

  it('returns null if the create provider transaction fails to submit', async () => {
    const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
    gasPriceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1000));
    const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
    balanceSpy.mockResolvedValueOnce(ethers.BigNumber.from(250_000_000));
    estimateCreateProviderMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
    createProviderMock.mockRejectedValueOnce(new Error('Failed to submit tx'));
    const [logs, res] = await providers.create(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Creating provider with address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410...' },
      { level: 'INFO', message: 'Estimating transaction cost for creating provider...' },
      { level: 'INFO', message: 'Estimated gas limit: 70000' },
      { level: 'INFO', message: 'Gas price set to 0.000001 Gwei' },
      { level: 'INFO', message: 'Master wallet balance: 0.00000000025 ETH' },
      { level: 'INFO', message: 'Submitting create provider transaction...' },
      {
        level: 'ERROR',
        message: 'Unable to submit create provider transaction',
        error: new Error('Failed to submit tx'),
      },
    ]);
    expect(res).toEqual(null);
    expect(estimateCreateProviderMock).toHaveBeenCalledTimes(1);
    expect(createProviderMock).toHaveBeenCalledTimes(1);
    expect(createProviderMock).toHaveBeenCalledWith(
      '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      'xpub661MyMwAqRbcF9ehXsbUTRmxvQFAJ35VCUqyGHPiJ1L1mtHm8pkDeUPsmLPVLLfY61nkFcHiBNeAYm9V3MLfveemc8SWwH2jqQzG6qdgqoH',
      {
        // 250_000_000 - ((50_000 + 20_000) * 1000)
        value: ethers.BigNumber.from(180_000_000),
        gasPrice: ethers.BigNumber.from(1000),
        gasLimit: ethers.BigNumber.from(70_000),
      }
    );
  });
});

describe('findOrCreateProviderWithBlock', () => {
  const options = {
    adminAddressForCreatingProviderRecord: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
    airnodeAddress: '0xe60b966B798f9a0C41724f111225A5586ff30656',
    convenienceAddress: '0xD5659F26A72A8D718d1955C42B3AE418edB001e0',
    provider: new ethers.providers.JsonRpcProvider(),
  };

  it('returns null if it fails to get the provider and block data', async () => {
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

  it('returns null if attemping creating the provider without adminAddressForCreatingProviderRecord', async () => {
    getProviderAndBlockNumberMock.mockResolvedValueOnce({
      admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      blockNumber: ethers.BigNumber.from('12'),
      xpub: '',
    });
    const [logs, res] = await providers.findOrCreateProviderWithBlock({
      ...options,
      adminAddressForCreatingProviderRecord: undefined,
    });
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message:
          'Computed provider ID from mnemonic:0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9',
      },
      { level: 'INFO', message: 'Fetching current block and provider admin details...' },
      { level: 'INFO', message: 'Current block:12' },
      { level: 'INFO', message: 'Provider not found' },
      { level: 'ERROR', message: 'Unable to find adminAddressForCreatingProviderRecord address' },
    ]);
    expect(res).toEqual(null);
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledTimes(1);
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledWith(
      '0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9'
    );
    expect(estimateCreateProviderMock).not.toHaveBeenCalled();
    expect(createProviderMock).not.toHaveBeenCalled();
  });

  it('creates a provider if xpub if empty and returns the transaction', async () => {
    getProviderAndBlockNumberMock.mockResolvedValueOnce({
      admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      blockNumber: ethers.BigNumber.from('12'),
      xpub: '',
    });
    const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
    gasPriceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1000));
    const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
    balanceSpy.mockResolvedValueOnce(ethers.BigNumber.from(250_000_000));
    estimateCreateProviderMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
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
      { level: 'INFO', message: 'Estimating transaction cost for creating provider...' },
      { level: 'INFO', message: 'Estimated gas limit: 70000' },
      { level: 'INFO', message: 'Gas price set to 0.000001 Gwei' },
      { level: 'INFO', message: 'Master wallet balance: 0.00000000025 ETH' },
      { level: 'INFO', message: 'Submitting create provider transaction...' },
      { level: 'INFO', message: 'Create provider transaction submitted:0xsuccessful' },
      {
        level: 'INFO',
        message: 'Airnode will not process requests until the create provider transaction has been confirmed',
      },
    ]);
    expect(res).toEqual({
      adminAddressForCreatingProviderRecord: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      blockNumber: 12,
      providerExists: false,
      xpub: '',
    });
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledTimes(1);
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledWith(
      '0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9'
    );
    expect(estimateCreateProviderMock).toHaveBeenCalledTimes(1);
    expect(createProviderMock).toHaveBeenCalledTimes(1);
    expect(createProviderMock).toHaveBeenCalledWith(
      '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      'xpub661MyMwAqRbcF9ehXsbUTRmxvQFAJ35VCUqyGHPiJ1L1mtHm8pkDeUPsmLPVLLfY61nkFcHiBNeAYm9V3MLfveemc8SWwH2jqQzG6qdgqoH',
      {
        // 250_000_000 - ((50_000 + 20_000) * 1000)
        value: ethers.BigNumber.from(180_000_000),
        gasPrice: ethers.BigNumber.from(1000),
        gasLimit: ethers.BigNumber.from(70_000),
      }
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
      adminAddressForCreatingProviderRecord: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
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
