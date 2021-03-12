const getProviderAndBlockNumberMock = jest.fn();
const setProviderParametersMock = jest.fn();
const estimateSetProviderParametersMock = jest.fn();
jest.mock('ethers', () => ({
  ethers: {
    ...jest.requireActual('ethers'),
    Contract: jest.fn().mockImplementation(() => ({
      setProviderParametersAndForwardFunds: setProviderParametersMock,
      estimateGas: {
        setProviderParametersAndForwardFunds: estimateSetProviderParametersMock,
      },
      getProviderAndBlockNumber: getProviderAndBlockNumberMock,
    })),
  },
}));

import { ethers } from 'ethers';
import * as wallet from './wallet';
import * as initialization from './initialization';

describe('providerDetailsMatch', () => {
  const options = {
    authorizers: [ethers.constants.AddressZero],
    masterHDNode: wallet.getMasterHDNode(),
    providerAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
  };

  const validData = {
    authorizers: [ethers.constants.AddressZero],
    blockNumber: 12,
    providerAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
    xpub:
      'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
  };

  it('is true if the provider onchain data matches the expected data', () => {
    const res = initialization.providerDetailsMatch(options, validData);
    expect(res).toEqual(true);
  });

  it('is false if the provider admin does not exist', () => {
    const invalidData = { ...validData, providerAdmin: '' };
    const res = initialization.providerDetailsMatch(options, invalidData);
    expect(res).toEqual(false);
  });

  it('is false if the authorizers do not match', () => {
    const invalidData = { ...validData, authorizers: ['0xD5659F26A72A8D718d1955C42B3AE418edB001e0'] };
    const res = initialization.providerDetailsMatch(options, invalidData);
    expect(res).toEqual(false);
  });
});

describe('providerExistsOnchain', () => {
  const options = {
    authorizers: [ethers.constants.AddressZero],
    masterHDNode: wallet.getMasterHDNode(),
    providerAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
  };

  const validData = {
    authorizers: [ethers.constants.AddressZero],
    blockNumber: 12,
    providerAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
    xpub:
      'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
  };

  it('is true if the provider onchain data matches the expected data', () => {
    const res = initialization.providerExistsOnchain(options, validData);
    expect(res).toEqual(true);
  });

  it('is false if the provider admin does not exist', () => {
    const invalidData = { ...validData, providerAdmin: '' };
    const res = initialization.providerExistsOnchain(options, invalidData);
    expect(res).toEqual(false);
  });

  it('is false if the authorizers do not match', () => {
    const invalidData = { ...validData, authorizers: ['0xD5659F26A72A8D718d1955C42B3AE418edB001e0'] };
    const res = initialization.providerExistsOnchain(options, invalidData);
    expect(res).toEqual(false);
  });

  it('is false if the extended public key does not match', () => {
    const invalidData = { ...validData, xpub: '' };
    const res = initialization.providerExistsOnchain(options, invalidData);
    expect(res).toEqual(false);
  });
});

describe('fetchProviderWithData', () => {
  const options = {
    airnodeRrpAddress: '0xe60b966B798f9a0C41724f111225A5586ff30656',
    authorizers: [ethers.constants.AddressZero],
    masterHDNode: wallet.getMasterHDNode(),
    provider: new ethers.providers.JsonRpcProvider(),
    providerAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
    providerId: '0xproviderId',
  };

  it('returns the admin address, xpub and current block number', async () => {
    getProviderAndBlockNumberMock.mockResolvedValueOnce({
      admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      authorizers: [ethers.constants.AddressZero],
      blockNumber: ethers.BigNumber.from('12'),
      xpub:
        'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
    });
    const [logs, res] = await initialization.fetchProviderWithData(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Fetching current block and provider admin details...' },
      { level: 'INFO', message: 'Current block:12' },
      { level: 'INFO', message: 'Admin address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410' },
      {
        level: 'INFO',
        message:
          'Provider extended public key:xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
      },
    ]);
    expect(res).toEqual({
      authorizers: [ethers.constants.AddressZero],
      blockNumber: 12,
      providerAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      xpub:
        'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
    });
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledTimes(1);
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledWith('0xproviderId');
  });

  it('checks that the extended public key exists', async () => {
    getProviderAndBlockNumberMock.mockResolvedValueOnce({
      admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      authorizers: [ethers.constants.AddressZero],
      blockNumber: ethers.BigNumber.from('12'),
      xpub: '',
    });
    const [logs, res] = await initialization.fetchProviderWithData(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Fetching current block and provider admin details...' },
      { level: 'INFO', message: 'Current block:12' },
      { level: 'INFO', message: 'Provider not found' },
    ]);
    expect(res).toEqual({
      authorizers: [ethers.constants.AddressZero],
      blockNumber: 12,
      providerAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      xpub: '',
    });
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledTimes(1);
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledWith('0xproviderId');
  });

  it('retries once on failure', async () => {
    getProviderAndBlockNumberMock.mockRejectedValueOnce(new Error('Server says no'));
    getProviderAndBlockNumberMock.mockResolvedValueOnce({
      admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      authorizers: [ethers.constants.AddressZero],
      blockNumber: ethers.BigNumber.from('12'),
      xpub:
        'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
    });
    const [logs, res] = await initialization.fetchProviderWithData(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Fetching current block and provider admin details...' },
      { level: 'INFO', message: 'Current block:12' },
      { level: 'INFO', message: 'Admin address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410' },
      {
        level: 'INFO',
        message:
          'Provider extended public key:xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
      },
    ]);
    expect(res).toEqual({
      authorizers: [ethers.constants.AddressZero],
      blockNumber: 12,
      providerAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      xpub:
        'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
    });
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledTimes(2);
    expect(getProviderAndBlockNumberMock.mock.calls).toEqual([['0xproviderId'], ['0xproviderId']]);
  });

  it('returns null if the retries are exhausted', async () => {
    getProviderAndBlockNumberMock.mockRejectedValueOnce(new Error('Server says no'));
    getProviderAndBlockNumberMock.mockRejectedValueOnce(new Error('Server says no'));
    const [logs, res] = await initialization.fetchProviderWithData(options);
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

describe('setProviderParameters', () => {
  const options = {
    airnodeRrpAddress: '0xe60b966B798f9a0C41724f111225A5586ff30656',
    authorizers: [ethers.constants.AddressZero],
    masterHDNode: wallet.getMasterHDNode(),
    provider: new ethers.providers.JsonRpcProvider(),
    providerAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
    currentXpub:
      'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
    onchainData: {
      authorizers: [ethers.constants.AddressZero],
      blockNumber: 12,
      providerAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      xpub:
        'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
    },
  };

  it('sets the provider parameters and returns the transaction', async () => {
    const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
    gasPriceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1000));
    const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
    balanceSpy.mockResolvedValueOnce(ethers.BigNumber.from(250_000_000));
    estimateSetProviderParametersMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
    setProviderParametersMock.mockResolvedValueOnce({ hash: '0xsuccessful' });
    const [logs, res] = await initialization.setProviderParameters(options);
    expect(logs).toEqual([
      {
        level: 'INFO',
        message: 'Setting provider parameters with address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410...',
      },
      { level: 'INFO', message: 'Estimating transaction cost for setting provider parameters...' },
      { level: 'INFO', message: 'Estimated gas limit: 70000' },
      { level: 'INFO', message: 'Gas price set to 0.000001 Gwei' },
      { level: 'INFO', message: 'Master wallet balance: 0.00000000025 ETH' },
      { level: 'INFO', message: 'Submitting set provider parameters transaction...' },
      { level: 'INFO', message: 'Set provider parameters transaction submitted:0xsuccessful' },
      {
        level: 'INFO',
        message: 'Airnode will not process requests until the set provider parameters transaction has been confirmed',
      },
    ]);
    expect(res).toEqual({ hash: '0xsuccessful' });
    expect(estimateSetProviderParametersMock).toHaveBeenCalledTimes(1);
    expect(setProviderParametersMock).toHaveBeenCalledTimes(1);
    expect(setProviderParametersMock).toHaveBeenCalledWith(
      '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
      [ethers.constants.AddressZero],
      {
        // 250_000_000 - ((50_000 + 20_000) * 1000)
        value: ethers.BigNumber.from(180_000_000),
        gasPrice: ethers.BigNumber.from(1000),
        gasLimit: ethers.BigNumber.from(70_000),
      }
    );
  });

  it('returns null if the gas limit estimate fails', async () => {
    estimateSetProviderParametersMock.mockRejectedValueOnce(new Error('Unable to estimate gas limit'));
    estimateSetProviderParametersMock.mockRejectedValueOnce(new Error('Unable to estimate gas limit'));
    const [logs, res] = await initialization.setProviderParameters(options);
    expect(logs).toEqual([
      {
        level: 'INFO',
        message: 'Setting provider parameters with address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410...',
      },
      { level: 'INFO', message: 'Estimating transaction cost for setting provider parameters...' },
      {
        level: 'ERROR',
        message: 'Unable to estimate transaction cost',
        error: new Error('Unable to estimate gas limit'),
      },
    ]);
    expect(res).toEqual(null);
    expect(estimateSetProviderParametersMock).toHaveBeenCalledTimes(2);
    expect(setProviderParametersMock).not.toHaveBeenCalled();
  });

  it('returns null if the gas price cannot be fetched', async () => {
    const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
    gasPriceSpy.mockRejectedValueOnce(new Error('Failed to fetch gas price'));
    gasPriceSpy.mockRejectedValueOnce(new Error('Failed to fetch gas price'));
    estimateSetProviderParametersMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
    const [logs, res] = await initialization.setProviderParameters(options);
    expect(logs).toEqual([
      {
        level: 'INFO',
        message: 'Setting provider parameters with address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410...',
      },
      { level: 'INFO', message: 'Estimating transaction cost for setting provider parameters...' },
      { level: 'INFO', message: 'Estimated gas limit: 70000' },
      { level: 'ERROR', message: 'Unable to fetch gas price', error: new Error('Failed to fetch gas price') },
    ]);
    expect(res).toEqual(null);
    expect(estimateSetProviderParametersMock).toHaveBeenCalledTimes(1);
    expect(setProviderParametersMock).not.toHaveBeenCalled();
  });

  it('returns null if the master wallet balance cannot be fetched', async () => {
    const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
    gasPriceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1000));
    const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
    balanceSpy.mockRejectedValueOnce(new Error('Failed to fetch balance'));
    balanceSpy.mockRejectedValueOnce(new Error('Failed to fetch balance'));
    estimateSetProviderParametersMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
    const [logs, res] = await initialization.setProviderParameters(options);
    expect(logs).toEqual([
      {
        level: 'INFO',
        message: 'Setting provider parameters with address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410...',
      },
      { level: 'INFO', message: 'Estimating transaction cost for setting provider parameters...' },
      { level: 'INFO', message: 'Estimated gas limit: 70000' },
      { level: 'INFO', message: 'Gas price set to 0.000001 Gwei' },
      { level: 'ERROR', message: 'Unable to fetch master wallet balance', error: new Error('Failed to fetch balance') },
    ]);
    expect(res).toEqual(null);
    expect(estimateSetProviderParametersMock).toHaveBeenCalledTimes(1);
    expect(setProviderParametersMock).not.toHaveBeenCalled();
  });

  it('returns null if the set provider parameters transaction fails to submit', async () => {
    const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
    gasPriceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1000));
    const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
    balanceSpy.mockResolvedValueOnce(ethers.BigNumber.from(250_000_000));
    estimateSetProviderParametersMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
    setProviderParametersMock.mockRejectedValueOnce(new Error('Failed to submit tx'));
    setProviderParametersMock.mockRejectedValueOnce(new Error('Failed to submit tx'));
    const [logs, res] = await initialization.setProviderParameters(options);
    expect(logs).toEqual([
      {
        level: 'INFO',
        message: 'Setting provider parameters with address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410...',
      },
      { level: 'INFO', message: 'Estimating transaction cost for setting provider parameters...' },
      { level: 'INFO', message: 'Estimated gas limit: 70000' },
      { level: 'INFO', message: 'Gas price set to 0.000001 Gwei' },
      { level: 'INFO', message: 'Master wallet balance: 0.00000000025 ETH' },
      { level: 'INFO', message: 'Submitting set provider parameters transaction...' },
      {
        level: 'ERROR',
        message: 'Unable to submit set provider parameters transaction',
        error: new Error('Failed to submit tx'),
      },
    ]);
    expect(res).toEqual(null);
    expect(estimateSetProviderParametersMock).toHaveBeenCalledTimes(1);
    expect(setProviderParametersMock).toHaveBeenCalledTimes(2);
    expect(setProviderParametersMock).toHaveBeenCalledWith(
      '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
      [ethers.constants.AddressZero],
      {
        // 250_000_000 - ((50_000 + 20_000) * 1000)
        value: ethers.BigNumber.from(180_000_000),
        gasPrice: ethers.BigNumber.from(1000),
        gasLimit: ethers.BigNumber.from(70_000),
      }
    );
  });

  describe('insufficient funds in the master wallet', () => {
    it('warns the user if the onchain provider would be updated', async () => {
      options.onchainData.authorizers = ['0xD5659F26A72A8D718d1955C42B3AE418edB001e0'];
      const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
      gasPriceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1000));
      const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
      balanceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1_000));
      estimateSetProviderParametersMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
      const [logs, res] = await initialization.setProviderParameters(options);
      expect(logs).toEqual([
        {
          level: 'INFO',
          message: 'Setting provider parameters with address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410...',
        },
        { level: 'INFO', message: 'Estimating transaction cost for setting provider parameters...' },
        { level: 'INFO', message: 'Estimated gas limit: 70000' },
        { level: 'INFO', message: 'Gas price set to 0.000001 Gwei' },
        {
          level: 'WARN',
          message: 'Unable to update onchain provider record as the master wallet does not have sufficient funds',
        },
        {
          level: 'WARN',
          message: 'Current balance: 0.000000000000001 ETH. Estimated transaction cost: 0.00000000007 ETH',
        },
        {
          level: 'WARN',
          message:
            'Any updates to "providerAdmin" or "authorizers" will not take affect until the provider has been updated',
        },
      ]);
      expect(res).toEqual({});
      expect(estimateSetProviderParametersMock).toHaveBeenCalledTimes(1);
      expect(setProviderParametersMock).not.toHaveBeenCalled();
    });

    it('does not warn if there is no onchain provider but fails to set the provider parameters', async () => {
      options.onchainData.xpub = '';
      const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
      gasPriceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1000));
      const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
      balanceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1_000));
      estimateSetProviderParametersMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
      setProviderParametersMock.mockRejectedValue(new Error('Insufficient funds'));
      const [logs, res] = await initialization.setProviderParameters(options);
      expect(logs.filter((l) => l.level === 'WARN')).toEqual([]);
      expect(logs.filter((l) => l.level === 'ERROR')).toEqual([
        {
          level: 'ERROR',
          message: 'Unable to submit set provider parameters transaction',
          error: new Error('Insufficient funds'),
        },
      ]);
      expect(res).toEqual(null);
      expect(estimateSetProviderParametersMock).toHaveBeenCalledTimes(1);
      expect(setProviderParametersMock).toHaveBeenCalledTimes(2);
    });

    it('does not warn if the onchain xpub is different', async () => {
      options.onchainData.xpub = '0xanotherxpub';
      const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
      gasPriceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1000));
      const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
      balanceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1_000));
      estimateSetProviderParametersMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
      setProviderParametersMock.mockRejectedValue(new Error('Insufficient funds'));
      const [logs, res] = await initialization.setProviderParameters(options);
      expect(logs.filter((l) => l.level === 'WARN')).toEqual([]);
      expect(logs.filter((l) => l.level === 'ERROR')).toEqual([
        {
          level: 'ERROR',
          message: 'Unable to submit set provider parameters transaction',
          error: new Error('Insufficient funds'),
        },
      ]);
      expect(res).toEqual(null);
      expect(estimateSetProviderParametersMock).toHaveBeenCalledTimes(1);
      expect(setProviderParametersMock).toHaveBeenCalledTimes(2);
    });

    it('does not warn if the provider details match', async () => {
      const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
      gasPriceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1000));
      const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
      balanceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1_000));
      estimateSetProviderParametersMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
      setProviderParametersMock.mockRejectedValue(new Error('Insufficient funds'));
      const [logs, res] = await initialization.setProviderParameters(options);
      expect(logs.filter((l) => l.level === 'WARN')).toEqual([]);
      expect(logs.filter((l) => l.level === 'ERROR')).toEqual([
        {
          level: 'ERROR',
          message: 'Unable to submit set provider parameters transaction',
          error: new Error('Insufficient funds'),
        },
      ]);
      expect(res).toEqual(null);
      expect(estimateSetProviderParametersMock).toHaveBeenCalledTimes(1);
      expect(setProviderParametersMock).toHaveBeenCalledTimes(2);
    });
  });
});

describe('verifyOrSetProviderParameters', () => {
  const options = {
    airnodeRrpAddress: '0xe60b966B798f9a0C41724f111225A5586ff30656',
    authorizers: [ethers.constants.AddressZero],
    masterHDNode: wallet.getMasterHDNode(),
    provider: new ethers.providers.JsonRpcProvider(),
    providerAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
  };

  it('returns null if it fails to get the provider and block data', async () => {
    getProviderAndBlockNumberMock.mockRejectedValueOnce(new Error('Server says no'));
    getProviderAndBlockNumberMock.mockRejectedValueOnce(new Error('Server says no'));
    const [logs, res] = await initialization.verifyOrSetProviderParameters(options);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message:
          'Computed provider ID from mnemonic:0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
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
      ['0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb'],
      ['0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb'],
    ]);
  });

  it('sets the provider parameters if xpub if empty and returns the transaction', async () => {
    getProviderAndBlockNumberMock.mockResolvedValueOnce({
      admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      authorizers: [ethers.constants.AddressZero],
      blockNumber: ethers.BigNumber.from('12'),
      xpub: '',
    });
    const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
    gasPriceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1000));
    const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
    balanceSpy.mockResolvedValueOnce(ethers.BigNumber.from(250_000_000));
    estimateSetProviderParametersMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
    setProviderParametersMock.mockResolvedValueOnce({ hash: '0xsuccessful' });
    const [logs, res] = await initialization.verifyOrSetProviderParameters(options);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message:
          'Computed provider ID from mnemonic:0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
      },
      { level: 'INFO', message: 'Fetching current block and provider admin details...' },
      { level: 'INFO', message: 'Current block:12' },
      { level: 'INFO', message: 'Provider not found' },
      {
        level: 'INFO',
        message: 'Setting provider parameters with address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410...',
      },
      { level: 'INFO', message: 'Estimating transaction cost for setting provider parameters...' },
      { level: 'INFO', message: 'Estimated gas limit: 70000' },
      { level: 'INFO', message: 'Gas price set to 0.000001 Gwei' },
      { level: 'INFO', message: 'Master wallet balance: 0.00000000025 ETH' },
      { level: 'INFO', message: 'Submitting set provider parameters transaction...' },
      { level: 'INFO', message: 'Set provider parameters transaction submitted:0xsuccessful' },
      {
        level: 'INFO',
        message: 'Airnode will not process requests until the set provider parameters transaction has been confirmed',
      },
    ]);
    expect(res).toEqual({
      authorizers: [ethers.constants.AddressZero],
      blockNumber: 12,
      providerAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      xpub: '',
    });
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledTimes(1);
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledWith(
      '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb'
    );
    expect(estimateSetProviderParametersMock).toHaveBeenCalledTimes(1);
    expect(setProviderParametersMock).toHaveBeenCalledTimes(1);
    expect(setProviderParametersMock).toHaveBeenCalledWith(
      '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
      [ethers.constants.AddressZero],
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
      authorizers: [ethers.constants.AddressZero],
      blockNumber: ethers.BigNumber.from('12'),
      xpub:
        'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
    });
    const [logs, res] = await initialization.verifyOrSetProviderParameters(options);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message:
          'Computed provider ID from mnemonic:0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
      },
      { level: 'INFO', message: 'Fetching current block and provider admin details...' },
      { level: 'INFO', message: 'Current block:12' },
      { level: 'INFO', message: 'Admin address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410' },
      {
        level: 'INFO',
        message:
          'Provider extended public key:xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
      },
      { level: 'DEBUG', message: 'Skipping provider creation as the provider exists' },
    ]);
    expect(res).toEqual({
      authorizers: [ethers.constants.AddressZero],
      blockNumber: 12,
      providerAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      xpub:
        'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
    });
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledTimes(1);
    expect(getProviderAndBlockNumberMock).toHaveBeenCalledWith(
      '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb'
    );
    expect(setProviderParametersMock).not.toHaveBeenCalled();
  });
});
