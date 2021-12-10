import { mockEthers } from '../../test/mock-utils';

const getBlockMock = jest.fn();
const getGasPriceMock = jest.fn();
const latestAnswerMock = jest.fn();
mockEthers({
  ethersMocks: {
    providers: {
      JsonRpcProvider: jest.fn().mockImplementation(() => ({
        getGasPrice: getGasPriceMock,
        getBlock: getBlockMock,
      })),
    },
    Contract: jest.fn().mockImplementation(() => ({
      latestAnswer: latestAnswerMock,
    })),
  },
});

import { BigNumber, ethers } from 'ethers';
import * as gasPrices from './gas-prices';
import { BASE_FEE_MULTIPLIER, PRIORITY_FEE } from '../constants';
import { ChainOptions } from '../types';

const makeLegacyBaseOptions = () => ({
  provider: new ethers.providers.JsonRpcProvider(),
  chainOptions: {
    txType: '1',
  } as ChainOptions,
});

const makeEip1559BaseOptions = () => {
  const provider = new ethers.providers.JsonRpcProvider();

  const eip1559ChainOptions = [
    {
      txType: '2',
      baseFeeMultiplier: BASE_FEE_MULTIPLIER,
      priorityFeeGWei: '3.12',
    } as ChainOptions,
    {
      txType: '2',
      baseFeeMultiplier: undefined,
      priorityFeeGWei: '3.12',
    } as ChainOptions,
    {
      txType: '2',
      baseFeeMultiplier: BASE_FEE_MULTIPLIER,
      priorityFeeGWei: undefined,
    } as ChainOptions,
    {
      txType: '2',
      baseFeeMultiplier: undefined,
      priorityFeeGWei: undefined,
    } as ChainOptions,
  ];

  return eip1559ChainOptions.map((chainOptions) => ({ provider, chainOptions }));
};

describe('getGasPrice', () => {
  const baseFeePerGas = ethers.BigNumber.from('93000000000');
  const maxPriorityFeePerGas = BigNumber.from(PRIORITY_FEE);
  const maxFeePerGas = baseFeePerGas.mul(BASE_FEE_MULTIPLIER).add(maxPriorityFeePerGas);
  const testGasPrice = ethers.BigNumber.from('48000000000');

  test.each(makeEip1559BaseOptions())(
    `returns the gas price from an EIP-1559 provider - test case: %#`,
    async (baseOptions) => {
      const getBlock = baseOptions.provider.getBlock as jest.Mock;
      getBlock.mockResolvedValueOnce({
        baseFeePerGas,
      });
      const getGasPrice = baseOptions.provider.getGasPrice as jest.Mock;

      const [logs, gasPrice] = await gasPrices.getGasPrice(baseOptions);
      expect(logs).toEqual([]);
      expect(gasPrice?.maxPriorityFeePerGas).toEqual(maxPriorityFeePerGas);
      expect(gasPrice?.maxFeePerGas).toEqual(maxFeePerGas);
      expect(getGasPrice).toHaveBeenCalledTimes(0);
      expect(getBlock).toHaveBeenCalledTimes(1);
    }
  );

  it('returns the gas price from a non-EIP-1559 provider', async () => {
    const baseOptions = makeLegacyBaseOptions();
    const getBlock = baseOptions.provider.getBlock as jest.Mock;

    const getGasPrice = baseOptions.provider.getGasPrice as jest.Mock;
    getGasPrice.mockResolvedValueOnce(testGasPrice);

    const [logs, gasPrice] = await gasPrices.getGasPrice(baseOptions);

    expect(logs.length).toEqual(0);
    expect(gasPrice).toEqual({ gasPrice: testGasPrice });
    expect(getGasPrice).toHaveBeenCalledTimes(1);
    expect(getBlock).toHaveBeenCalledTimes(0);
  });

  it('retries once on failure for a non-EIP-1559 provider', async () => {
    const baseOptions = makeLegacyBaseOptions();
    const getBlock = baseOptions.provider.getBlock as jest.Mock;

    const getGasPrice = baseOptions.provider.getGasPrice as jest.Mock;
    getGasPrice.mockRejectedValueOnce(new Error('Server is down'));
    getGasPrice.mockResolvedValueOnce(testGasPrice);

    const [logs, gasPrice] = await gasPrices.getGasPrice(baseOptions);

    expect(logs.length).toEqual(0);
    expect(gasPrice).toEqual({ gasPrice: testGasPrice });
    expect(getGasPrice).toHaveBeenCalledTimes(2);
    expect(getBlock).toHaveBeenCalledTimes(0);
  });

  it('retries a maximum of twice then returns null for non-EIP-1559 provider', async () => {
    const baseOptions = makeLegacyBaseOptions();
    const getGasPrice = baseOptions.provider.getGasPrice as jest.Mock;
    getGasPrice.mockRejectedValueOnce(new Error('Server is down'));
    getGasPrice.mockRejectedValueOnce(new Error('Server is down'));

    const [logs, gasPrice] = await gasPrices.getGasPrice(baseOptions);

    expect(logs).toEqual([
      { level: 'ERROR', message: 'Failed to get legacy gas price from provider', error: new Error('Server is down') },
    ]);
    expect(gasPrice).toEqual(null);
    expect(baseOptions.provider.getGasPrice).toHaveBeenCalledTimes(2);
    expect(baseOptions.provider.getBlock).toHaveBeenCalledTimes(0);
  });

  test.each(makeEip1559BaseOptions())(
    `retries once on failure for an EIP-1559 provider - test case: %#`,
    async (baseOptions) => {
      const getGasPrice = baseOptions.provider.getGasPrice as jest.Mock;

      const getBlock = baseOptions.provider.getBlock as jest.Mock;
      getBlock.mockRejectedValueOnce(new Error('Server is down'));
      getBlock.mockResolvedValueOnce({
        baseFeePerGas,
      });

      const [logs, gasPrice] = await gasPrices.getGasPrice(baseOptions);

      expect(logs.length).toEqual(0);
      expect(gasPrice?.maxPriorityFeePerGas).toEqual(maxPriorityFeePerGas);
      expect(gasPrice?.maxFeePerGas).toEqual(maxFeePerGas);
      expect(getGasPrice).toHaveBeenCalledTimes(0);
      expect(getBlock).toHaveBeenCalledTimes(2);
    }
  );

  test.each(makeEip1559BaseOptions())(
    `retries a maximum of twice on failure of getBlock for an EIP-1559 provider and then returns null - test case: %#`,
    async (baseOptions) => {
      const getGasPrice = baseOptions.provider.getGasPrice as jest.Mock;

      const getBlock = baseOptions.provider.getBlock as jest.Mock;
      getBlock.mockRejectedValueOnce(new Error('Server is down'));
      getBlock.mockRejectedValueOnce(new Error('Server is down'));

      const [logs, gasPrice] = await gasPrices.getGasPrice(baseOptions);

      expect(logs).toEqual([
        {
          error: new Error('Server is down'),
          level: 'INFO',
          message: 'Failed to get EIP-1559 gas pricing from provider',
        },
      ]);
      expect(gasPrice).toEqual(null);
      expect(getGasPrice).toHaveBeenCalledTimes(0);
      expect(getBlock).toHaveBeenCalledTimes(2);
    }
  );
});
