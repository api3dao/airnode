import { mockEthers } from '../../test/utils';
const getAirnodeParametersAndBlockNumberMock = jest.fn();
const setAirnodeParametersMock = jest.fn();
const estimateSetAirnodeParametersMock = jest.fn();
mockEthers({
  airnodeRrpMocks: {
    setAirnodeParametersAndForwardFunds: setAirnodeParametersMock,
    estimateGas: {
      setAirnodeParametersAndForwardFunds: estimateSetAirnodeParametersMock,
    },
    getAirnodeParametersAndBlockNumber: getAirnodeParametersAndBlockNumberMock,
  },
});

import { ethers } from 'ethers';
import * as wallet from './wallet';
import * as initialization from './initialization';

const initializationFunctions = ['airnodeParametersMatch', 'airnodeParametersExistOnchain'] as const;

initializationFunctions.forEach((initFunction) => {
  describe(initFunction, () => {
    const options = {
      airnodeAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      authorizers: [ethers.constants.AddressZero],
      masterHDNode: wallet.getMasterHDNode(),
    };

    const validData = {
      airnodeAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      authorizers: [ethers.constants.AddressZero],
      blockNumber: 12,
      xpub:
        'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
    };

    it('is true if the Airnode onchain parameters match the expected data', () => {
      const res = initialization[initFunction](options, validData);
      expect(res).toEqual(true);
    });

    it('is false if the Airnode admin does not exist', () => {
      const invalidData = { ...validData, airnodeAdmin: '' };
      const res = initialization[initFunction](options, invalidData);
      expect(res).toEqual(false);
    });

    it('is false if the authorizers do not match', () => {
      const invalidData = { ...validData, authorizers: ['0xD5659F26A72A8D718d1955C42B3AE418edB001e0'] };
      const res = initialization[initFunction](options, invalidData);
      expect(res).toEqual(false);
    });

    if (initFunction === 'airnodeParametersExistOnchain') {
      it('is false if the extended public key does not match', () => {
        const invalidData = { ...validData, xpub: '' };
        const res = initialization[initFunction](options, invalidData);
        expect(res).toEqual(false);
      });
    }
  });
});

describe('fetchAirnodeParametersWithData', () => {
  const options = {
    airnodeAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
    airnodeId: '0xairnodeId',
    airnodeRrpAddress: '0xe60b966B798f9a0C41724f111225A5586ff30656',
    authorizers: [ethers.constants.AddressZero],
    masterHDNode: wallet.getMasterHDNode(),
    provider: new ethers.providers.JsonRpcProvider(),
  };

  it('returns the admin address, xpub and current block number', async () => {
    getAirnodeParametersAndBlockNumberMock.mockResolvedValueOnce({
      admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      authorizers: [ethers.constants.AddressZero],
      blockNumber: ethers.BigNumber.from('12'),
      xpub:
        'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
    });
    const [logs, res] = await initialization.fetchAirnodeParametersWithData(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Fetching current block and Airnode parameters...' },
      { level: 'INFO', message: 'Current block:12' },
      { level: 'INFO', message: 'Admin address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410' },
      {
        level: 'INFO',
        message:
          'Airnode extended public key:xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
      },
    ]);
    expect(res).toEqual({
      airnodeAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      authorizers: [ethers.constants.AddressZero],
      blockNumber: 12,
      xpub:
        'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
    });
    expect(getAirnodeParametersAndBlockNumberMock).toHaveBeenCalledTimes(1);
    expect(getAirnodeParametersAndBlockNumberMock).toHaveBeenCalledWith('0xairnodeId');
  });

  it('checks that the extended public key exists', async () => {
    getAirnodeParametersAndBlockNumberMock.mockResolvedValueOnce({
      admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      authorizers: [ethers.constants.AddressZero],
      blockNumber: ethers.BigNumber.from('12'),
      xpub: '',
    });
    const [logs, res] = await initialization.fetchAirnodeParametersWithData(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Fetching current block and Airnode parameters...' },
      { level: 'INFO', message: 'Current block:12' },
      { level: 'INFO', message: 'Airnode parameters not found' },
    ]);
    expect(res).toEqual({
      airnodeAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      authorizers: [ethers.constants.AddressZero],
      blockNumber: 12,
      xpub: '',
    });
    expect(getAirnodeParametersAndBlockNumberMock).toHaveBeenCalledTimes(1);
    expect(getAirnodeParametersAndBlockNumberMock).toHaveBeenCalledWith('0xairnodeId');
  });

  it('retries once on failure', async () => {
    getAirnodeParametersAndBlockNumberMock.mockRejectedValueOnce(new Error('Server says no'));
    getAirnodeParametersAndBlockNumberMock.mockResolvedValueOnce({
      admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      authorizers: [ethers.constants.AddressZero],
      blockNumber: ethers.BigNumber.from('12'),
      xpub:
        'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
    });
    const [logs, res] = await initialization.fetchAirnodeParametersWithData(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Fetching current block and Airnode parameters...' },
      { level: 'INFO', message: 'Current block:12' },
      { level: 'INFO', message: 'Admin address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410' },
      {
        level: 'INFO',
        message:
          'Airnode extended public key:xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
      },
    ]);
    expect(res).toEqual({
      airnodeAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      authorizers: [ethers.constants.AddressZero],
      blockNumber: 12,
      xpub:
        'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
    });
    expect(getAirnodeParametersAndBlockNumberMock).toHaveBeenCalledTimes(2);
    expect(getAirnodeParametersAndBlockNumberMock.mock.calls).toEqual([['0xairnodeId'], ['0xairnodeId']]);
  });

  it('returns null if the retries are exhausted', async () => {
    getAirnodeParametersAndBlockNumberMock.mockRejectedValueOnce(new Error('Server says no'));
    getAirnodeParametersAndBlockNumberMock.mockRejectedValueOnce(new Error('Server says no'));
    const [logs, res] = await initialization.fetchAirnodeParametersWithData(options);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Fetching current block and Airnode parameters...' },
      {
        level: 'ERROR',
        message: 'Unable to fetch current block and Airnode parameters',
        error: new Error('Server says no'),
      },
    ]);
    expect(res).toEqual(null);
    expect(getAirnodeParametersAndBlockNumberMock).toHaveBeenCalledTimes(2);
    expect(getAirnodeParametersAndBlockNumberMock.mock.calls).toEqual([['0xairnodeId'], ['0xairnodeId']]);
  });
});

describe('setAirnodeParameters', () => {
  const options = {
    airnodeAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
    airnodeRrpAddress: '0xe60b966B798f9a0C41724f111225A5586ff30656',
    authorizers: [ethers.constants.AddressZero],
    masterHDNode: wallet.getMasterHDNode(),
    provider: new ethers.providers.JsonRpcProvider(),
    currentXpub:
      'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
    onchainData: {
      airnodeAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      authorizers: [ethers.constants.AddressZero],
      blockNumber: 12,
      xpub:
        'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
    },
  };

  it('sets the Airnode parameters and returns the transaction', async () => {
    const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
    gasPriceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1000));
    const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
    balanceSpy.mockResolvedValueOnce(ethers.BigNumber.from(250_000_000));
    estimateSetAirnodeParametersMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
    setAirnodeParametersMock.mockResolvedValueOnce({ hash: '0xsuccessful' });
    const [logs, res] = await initialization.setAirnodeParameters(options);
    expect(logs).toEqual([
      {
        level: 'INFO',
        message: 'Setting Airnode parameters with address:0x2886De6bbd66DB353C5Ce2e91359e7C39C962fd7...',
      },
      { level: 'INFO', message: 'Estimating transaction cost for setting Airnode parameters...' },
      { level: 'INFO', message: 'Estimated gas limit: 70000' },
      { level: 'INFO', message: 'Gas price set to 0.000001 Gwei' },
      { level: 'INFO', message: 'Master wallet balance: 0.00000000025 ETH' },
      { level: 'INFO', message: 'Submitting set Airnode parameters transaction...' },
      { level: 'INFO', message: 'Set Airnode parameters transaction submitted:0xsuccessful' },
      {
        level: 'INFO',
        message: 'Airnode will not process requests until the set Airnode parameters transaction has been confirmed',
      },
    ]);
    expect(res).toEqual({ hash: '0xsuccessful' });
    expect(estimateSetAirnodeParametersMock).toHaveBeenCalledTimes(1);
    expect(setAirnodeParametersMock).toHaveBeenCalledTimes(1);
    expect(setAirnodeParametersMock).toHaveBeenCalledWith(
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
    estimateSetAirnodeParametersMock.mockRejectedValueOnce(new Error('Unable to estimate gas limit'));
    estimateSetAirnodeParametersMock.mockRejectedValueOnce(new Error('Unable to estimate gas limit'));
    const [logs, res] = await initialization.setAirnodeParameters(options);
    expect(logs).toEqual([
      {
        level: 'INFO',
        message: 'Setting Airnode parameters with address:0x2886De6bbd66DB353C5Ce2e91359e7C39C962fd7...',
      },
      { level: 'INFO', message: 'Estimating transaction cost for setting Airnode parameters...' },
      {
        level: 'ERROR',
        message: 'Unable to estimate transaction cost',
        error: new Error('Unable to estimate gas limit'),
      },
    ]);
    expect(res).toEqual(null);
    expect(estimateSetAirnodeParametersMock).toHaveBeenCalledTimes(2);
    expect(setAirnodeParametersMock).not.toHaveBeenCalled();
  });

  it('returns null if the gas price cannot be fetched', async () => {
    const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
    gasPriceSpy.mockRejectedValueOnce(new Error('Failed to fetch gas price'));
    gasPriceSpy.mockRejectedValueOnce(new Error('Failed to fetch gas price'));
    estimateSetAirnodeParametersMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
    const [logs, res] = await initialization.setAirnodeParameters(options);
    expect(logs).toEqual([
      {
        level: 'INFO',
        message: 'Setting Airnode parameters with address:0x2886De6bbd66DB353C5Ce2e91359e7C39C962fd7...',
      },
      { level: 'INFO', message: 'Estimating transaction cost for setting Airnode parameters...' },
      { level: 'INFO', message: 'Estimated gas limit: 70000' },
      { level: 'ERROR', message: 'Unable to fetch gas price', error: new Error('Failed to fetch gas price') },
    ]);
    expect(res).toEqual(null);
    expect(estimateSetAirnodeParametersMock).toHaveBeenCalledTimes(1);
    expect(setAirnodeParametersMock).not.toHaveBeenCalled();
  });

  it('returns null if the master wallet balance cannot be fetched', async () => {
    const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
    gasPriceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1000));
    const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
    balanceSpy.mockRejectedValueOnce(new Error('Failed to fetch balance'));
    balanceSpy.mockRejectedValueOnce(new Error('Failed to fetch balance'));
    estimateSetAirnodeParametersMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
    const [logs, res] = await initialization.setAirnodeParameters(options);
    expect(logs).toEqual([
      {
        level: 'INFO',
        message: 'Setting Airnode parameters with address:0x2886De6bbd66DB353C5Ce2e91359e7C39C962fd7...',
      },
      { level: 'INFO', message: 'Estimating transaction cost for setting Airnode parameters...' },
      { level: 'INFO', message: 'Estimated gas limit: 70000' },
      { level: 'INFO', message: 'Gas price set to 0.000001 Gwei' },
      { level: 'ERROR', message: 'Unable to fetch master wallet balance', error: new Error('Failed to fetch balance') },
    ]);
    expect(res).toEqual(null);
    expect(estimateSetAirnodeParametersMock).toHaveBeenCalledTimes(1);
    expect(setAirnodeParametersMock).not.toHaveBeenCalled();
  });

  it('returns null if the set Airnode parameters transaction fails to submit', async () => {
    const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
    gasPriceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1000));
    const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
    balanceSpy.mockResolvedValueOnce(ethers.BigNumber.from(250_000_000));
    estimateSetAirnodeParametersMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
    setAirnodeParametersMock.mockRejectedValueOnce(new Error('Failed to submit tx'));
    setAirnodeParametersMock.mockRejectedValueOnce(new Error('Failed to submit tx'));
    const [logs, res] = await initialization.setAirnodeParameters(options);
    expect(logs).toEqual([
      {
        level: 'INFO',
        message: 'Setting Airnode parameters with address:0x2886De6bbd66DB353C5Ce2e91359e7C39C962fd7...',
      },
      { level: 'INFO', message: 'Estimating transaction cost for setting Airnode parameters...' },
      { level: 'INFO', message: 'Estimated gas limit: 70000' },
      { level: 'INFO', message: 'Gas price set to 0.000001 Gwei' },
      { level: 'INFO', message: 'Master wallet balance: 0.00000000025 ETH' },
      { level: 'INFO', message: 'Submitting set Airnode parameters transaction...' },
      {
        level: 'ERROR',
        message: 'Unable to submit set Airnode parameters transaction',
        error: new Error('Failed to submit tx'),
      },
    ]);
    expect(res).toEqual(null);
    expect(estimateSetAirnodeParametersMock).toHaveBeenCalledTimes(1);
    expect(setAirnodeParametersMock).toHaveBeenCalledTimes(2);
    expect(setAirnodeParametersMock).toHaveBeenCalledWith(
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
    it('warns the user if the onchain Airnode parameters would be updated', async () => {
      options.onchainData.authorizers = ['0xD5659F26A72A8D718d1955C42B3AE418edB001e0'];
      const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
      gasPriceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1000));
      const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
      balanceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1_000));
      estimateSetAirnodeParametersMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
      const [logs, res] = await initialization.setAirnodeParameters(options);
      expect(logs).toEqual([
        {
          level: 'INFO',
          message: 'Setting Airnode parameters with address:0x2886De6bbd66DB353C5Ce2e91359e7C39C962fd7...',
        },
        { level: 'INFO', message: 'Estimating transaction cost for setting Airnode parameters...' },
        { level: 'INFO', message: 'Estimated gas limit: 70000' },
        { level: 'INFO', message: 'Gas price set to 0.000001 Gwei' },
        {
          level: 'WARN',
          message: 'Unable to update onchain Airnode parameters as the master wallet does not have sufficient funds',
        },
        {
          level: 'WARN',
          message: 'Current balance: 0.000000000000001 ETH. Estimated transaction cost: 0.00000000007 ETH',
        },
        {
          level: 'WARN',
          message:
            'Any updates to "airnodeAdmin" or "authorizers" will not take affect until the Airnode parameters have been updated',
        },
      ]);
      expect(res).toEqual({});
      expect(estimateSetAirnodeParametersMock).toHaveBeenCalledTimes(1);
      expect(setAirnodeParametersMock).not.toHaveBeenCalled();
    });

    it('does not warn if there are no onchain Airnode parameters but fails to set the Airnode parameters', async () => {
      options.onchainData.xpub = '';
      const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
      gasPriceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1000));
      const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
      balanceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1_000));
      estimateSetAirnodeParametersMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
      setAirnodeParametersMock.mockRejectedValue(new Error('Insufficient funds'));
      const [logs, res] = await initialization.setAirnodeParameters(options);
      expect(logs.filter((l) => l.level === 'WARN')).toEqual([]);
      expect(logs.filter((l) => l.level === 'ERROR')).toEqual([
        {
          level: 'ERROR',
          message: 'Unable to submit set Airnode parameters transaction',
          error: new Error('Insufficient funds'),
        },
      ]);
      expect(res).toEqual(null);
      expect(estimateSetAirnodeParametersMock).toHaveBeenCalledTimes(1);
      expect(setAirnodeParametersMock).toHaveBeenCalledTimes(2);
    });

    it('does not warn if the onchain xpub is different', async () => {
      options.onchainData.xpub = '0xanotherxpub';
      const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
      gasPriceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1000));
      const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
      balanceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1_000));
      estimateSetAirnodeParametersMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
      setAirnodeParametersMock.mockRejectedValue(new Error('Insufficient funds'));
      const [logs, res] = await initialization.setAirnodeParameters(options);
      expect(logs.filter((l) => l.level === 'WARN')).toEqual([]);
      expect(logs.filter((l) => l.level === 'ERROR')).toEqual([
        {
          level: 'ERROR',
          message: 'Unable to submit set Airnode parameters transaction',
          error: new Error('Insufficient funds'),
        },
      ]);
      expect(res).toEqual(null);
      expect(estimateSetAirnodeParametersMock).toHaveBeenCalledTimes(1);
      expect(setAirnodeParametersMock).toHaveBeenCalledTimes(2);
    });

    it('does not warn if the Airnode parameters match', async () => {
      const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
      gasPriceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1000));
      const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
      balanceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1_000));
      estimateSetAirnodeParametersMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
      setAirnodeParametersMock.mockRejectedValue(new Error('Insufficient funds'));
      const [logs, res] = await initialization.setAirnodeParameters(options);
      expect(logs.filter((l) => l.level === 'WARN')).toEqual([]);
      expect(logs.filter((l) => l.level === 'ERROR')).toEqual([
        {
          level: 'ERROR',
          message: 'Unable to submit set Airnode parameters transaction',
          error: new Error('Insufficient funds'),
        },
      ]);
      expect(res).toEqual(null);
      expect(estimateSetAirnodeParametersMock).toHaveBeenCalledTimes(1);
      expect(setAirnodeParametersMock).toHaveBeenCalledTimes(2);
    });
  });
});

describe('verifyOrSetAirnodeParameters', () => {
  const options = {
    airnodeAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
    airnodeRrpAddress: '0xe60b966B798f9a0C41724f111225A5586ff30656',
    authorizers: [ethers.constants.AddressZero],
    masterHDNode: wallet.getMasterHDNode(),
    provider: new ethers.providers.JsonRpcProvider(),
  };

  it('returns null if it fails to get the Airnode parameters and block data', async () => {
    getAirnodeParametersAndBlockNumberMock.mockRejectedValueOnce(new Error('Server says no'));
    getAirnodeParametersAndBlockNumberMock.mockRejectedValueOnce(new Error('Server says no'));
    const [logs, res] = await initialization.verifyOrSetAirnodeParameters(options);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message: 'Computed Airnode ID from mnemonic:0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
      },
      { level: 'INFO', message: 'Fetching current block and Airnode parameters...' },
      {
        level: 'ERROR',
        message: 'Unable to fetch current block and Airnode parameters',
        error: new Error('Server says no'),
      },
    ]);
    expect(res).toEqual(null);
    expect(getAirnodeParametersAndBlockNumberMock).toHaveBeenCalledTimes(2);
    expect(getAirnodeParametersAndBlockNumberMock.mock.calls).toEqual([
      ['0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb'],
      ['0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb'],
    ]);
  });

  it('sets the Airnode parameters if xpub is empty and returns the transaction', async () => {
    getAirnodeParametersAndBlockNumberMock.mockResolvedValueOnce({
      admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      authorizers: [ethers.constants.AddressZero],
      blockNumber: ethers.BigNumber.from('12'),
      xpub: '',
    });
    const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
    gasPriceSpy.mockResolvedValueOnce(ethers.BigNumber.from(1000));
    const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
    balanceSpy.mockResolvedValueOnce(ethers.BigNumber.from(250_000_000));
    estimateSetAirnodeParametersMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
    setAirnodeParametersMock.mockResolvedValueOnce({ hash: '0xsuccessful' });
    const [logs, res] = await initialization.verifyOrSetAirnodeParameters(options);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message: 'Computed Airnode ID from mnemonic:0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
      },
      { level: 'INFO', message: 'Fetching current block and Airnode parameters...' },
      { level: 'INFO', message: 'Current block:12' },
      { level: 'INFO', message: 'Airnode parameters not found' },
      {
        level: 'INFO',
        message: 'Setting Airnode parameters with address:0x2886De6bbd66DB353C5Ce2e91359e7C39C962fd7...',
      },
      { level: 'INFO', message: 'Estimating transaction cost for setting Airnode parameters...' },
      { level: 'INFO', message: 'Estimated gas limit: 70000' },
      { level: 'INFO', message: 'Gas price set to 0.000001 Gwei' },
      { level: 'INFO', message: 'Master wallet balance: 0.00000000025 ETH' },
      { level: 'INFO', message: 'Submitting set Airnode parameters transaction...' },
      { level: 'INFO', message: 'Set Airnode parameters transaction submitted:0xsuccessful' },
      {
        level: 'INFO',
        message: 'Airnode will not process requests until the set Airnode parameters transaction has been confirmed',
      },
    ]);
    expect(res).toEqual({
      airnodeAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      authorizers: [ethers.constants.AddressZero],
      blockNumber: 12,
      xpub: '',
    });
    expect(getAirnodeParametersAndBlockNumberMock).toHaveBeenCalledTimes(1);
    expect(getAirnodeParametersAndBlockNumberMock).toHaveBeenCalledWith(
      '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb'
    );
    expect(estimateSetAirnodeParametersMock).toHaveBeenCalledTimes(1);
    expect(setAirnodeParametersMock).toHaveBeenCalledTimes(1);
    expect(setAirnodeParametersMock).toHaveBeenCalledWith(
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

  it('returns the Airnode parameters and block if the Airnode parameters already exist', async () => {
    getAirnodeParametersAndBlockNumberMock.mockResolvedValueOnce({
      admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      authorizers: [ethers.constants.AddressZero],
      blockNumber: ethers.BigNumber.from('12'),
      xpub:
        'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
    });
    const [logs, res] = await initialization.verifyOrSetAirnodeParameters(options);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message: 'Computed Airnode ID from mnemonic:0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
      },
      { level: 'INFO', message: 'Fetching current block and Airnode parameters...' },
      { level: 'INFO', message: 'Current block:12' },
      { level: 'INFO', message: 'Admin address:0x5e0051B74bb4006480A1b548af9F1F0e0954F410' },
      {
        level: 'INFO',
        message:
          'Airnode extended public key:xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
      },
      { level: 'DEBUG', message: 'Skipping Airnode parameters setting as the Airnode parameters exist' },
    ]);
    expect(res).toEqual({
      airnodeAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      authorizers: [ethers.constants.AddressZero],
      blockNumber: 12,
      xpub:
        'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
    });
    expect(getAirnodeParametersAndBlockNumberMock).toHaveBeenCalledTimes(1);
    expect(getAirnodeParametersAndBlockNumberMock).toHaveBeenCalledWith(
      '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb'
    );
    expect(setAirnodeParametersMock).not.toHaveBeenCalled();
  });
});
