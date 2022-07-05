/**
 * Mocks ethers library to return a mocked ethers provider with mocked gas prices and block data.
 */
function mockEthers() {
  jest.mock('ethers', () => ({
    ...jest.requireActual('ethers'),
    ethers: {
      ...jest.requireActual('ethers').ethers,
      providers: {
        JsonRpcProvider: jest.fn().mockImplementation(() => ({
          getGasPrice: jest.fn(),
          getBlock: jest.fn(),
        })),
      },
    },
  }));
}
mockEthers();

import { BigNumber, ethers } from 'ethers';
import * as gasPrices from './gas-prices';
import { FetchOptions, LegacyChainOptions } from './types';
import { BASE_FEE_MULTIPLIER, PRIORITY_FEE_IN_WEI } from '../../constants';

const createLegacyBaseOptions = (): FetchOptions => ({
  provider: new ethers.providers.JsonRpcProvider(),
  chainOptions: {
    txType: 'legacy',
    fulfillmentGasLimit: 500_000,
  },
});

const createEip1559BaseOptions = () => {
  const provider = new ethers.providers.JsonRpcProvider();

  const eip1559ChainOptions = [
    {
      txType: 'eip1559',
      baseFeeMultiplier: BASE_FEE_MULTIPLIER,
      priorityFee: {
        value: 3.12,
        unit: 'gwei',
      },
      fulfillmentGasLimit: 500_000,
      gasPriceOracle: [
        {
          gasPriceStrategy: 'constantGasPrice',
          gasPrice: {
            value: 10,
            unit: 'gwei',
          },
        },
      ],
    },
    {
      txType: 'eip1559',
      baseFeeMultiplier: undefined,
      priorityFee: {
        value: 3.12,
        unit: 'gwei',
      },
      fulfillmentGasLimit: 500_000,
      gasPriceOracle: [
        {
          gasPriceStrategy: 'constantGasPrice',
          gasPrice: {
            value: 10,
            unit: 'gwei',
          },
        },
      ],
    },
    {
      txType: 'eip1559',
      baseFeeMultiplier: BASE_FEE_MULTIPLIER,
      priorityFee: undefined,
      fulfillmentGasLimit: 500_000,
      gasPriceOracle: [
        {
          gasPriceStrategy: 'constantGasPrice',
          gasPrice: {
            value: 10,
            unit: 'gwei',
          },
        },
      ],
    },
    {
      txType: 'eip1559',
      baseFeeMultiplier: undefined,
      priorityFee: undefined,
      fulfillmentGasLimit: 500_000,
      gasPriceOracle: [
        {
          gasPriceStrategy: 'constantGasPrice',
          gasPrice: {
            value: 10,
            unit: 'gwei',
          },
        },
      ],
    },
  ] as const;

  return eip1559ChainOptions.map((chainOptions) => ({ provider, chainOptions }));
};

describe('parsePriorityFee', () => {
  [
    [{ value: 123, unit: 'wei' }, BigNumber.from('123')],
    [{ value: 123.4, unit: 'kwei' }, BigNumber.from('123400')],
    [{ value: 123.4, unit: 'mwei' }, BigNumber.from('123400000')],
    [{ value: 123.4, unit: 'gwei' }, BigNumber.from('123400000000')],
    [{ value: 123.4, unit: 'szabo' }, BigNumber.from('123400000000000')],
    [{ value: 123.4, unit: 'finney' }, BigNumber.from('123400000000000000')],
    [{ value: 123.4, unit: 'ether' }, BigNumber.from('123400000000000000000')],
  ].forEach(([input, result]: (any | BigNumber)[]) =>
    it('returns parsed wei from numbers - %#', () => {
      const priorityFeeInWei = gasPrices.parsePriorityFee(input);
      expect(priorityFeeInWei).toEqual(result);
    })
  );

  [
    { value: 3.12, unit: 'pence' },
    { value: '3.1p', unit: 'gwei' },
    { value: 3.12, unit: 'wei' },
  ].forEach((input: any) =>
    it('throws an error for an invalid decimal denominated string, number and unit - %#', () => {
      const throwingFunction = () => gasPrices.parsePriorityFee(input);
      expect(throwingFunction).toThrow();
    })
  );
});

describe('getGasPrice', () => {
  const baseFeePerGas = ethers.BigNumber.from('93000000000');
  const maxPriorityFeePerGas = BigNumber.from(PRIORITY_FEE_IN_WEI);
  const maxFeePerGas = baseFeePerGas.mul(BASE_FEE_MULTIPLIER).add(maxPriorityFeePerGas);
  const testGasPrice = ethers.BigNumber.from('48000000000');
  const gasLimit = ethers.BigNumber.from(500_000);

  createEip1559BaseOptions().forEach((baseOptions: FetchOptions) =>
    it(`returns the gas price from an EIP-1559 provider - test case: %#`, async () => {
      const getBlock = baseOptions.provider.getBlock as jest.Mock;
      getBlock.mockResolvedValueOnce({
        baseFeePerGas,
      });
      const getGasPrice = baseOptions.provider.getGasPrice as jest.Mock;

      const [logs, gasPrice] = await gasPrices.getProviderGasPrice(baseOptions);
      expect(logs).toEqual([]);
      expect(gasPrice).toEqual({
        type: 2,
        maxPriorityFeePerGas: maxPriorityFeePerGas,
        maxFeePerGas: maxFeePerGas,
        gasLimit: gasLimit,
      });
      expect(getGasPrice).toHaveBeenCalledTimes(0);
      expect(getBlock).toHaveBeenCalledTimes(1);
    })
  );

  it('returns the gas price from a non-EIP-1559 provider', async () => {
    const baseOptions = createLegacyBaseOptions();
    const getBlock = baseOptions.provider.getBlock as jest.Mock;

    const getGasPrice = baseOptions.provider.getGasPrice as jest.Mock;
    getGasPrice.mockResolvedValueOnce(testGasPrice);

    const [logs, gasPrice] = await gasPrices.getProviderGasPrice(baseOptions);

    expect(logs.length).toEqual(0);
    expect(gasPrice).toEqual({ type: 0, gasPrice: testGasPrice, gasLimit: gasLimit });
    expect(getGasPrice).toHaveBeenCalledTimes(1);
    expect(getBlock).toHaveBeenCalledTimes(0);
  });

  it('applies gasPriceMultiplier to non-EIP-1559 provider', async () => {
    const gasPriceMultiplier = 1.75;
    const baseOptions = createLegacyBaseOptions();
    const getBlock = baseOptions.provider.getBlock as jest.Mock;

    const getGasPrice = baseOptions.provider.getGasPrice as jest.Mock;
    getGasPrice.mockResolvedValueOnce(testGasPrice);

    const [logs, gasPrice] = await gasPrices.getProviderGasPrice({
      ...baseOptions,
      chainOptions: { ...baseOptions.chainOptions, gasPriceMultiplier } as LegacyChainOptions,
    });

    const multipliedTestGasPrice = gasPrices.multiplyGasPrice(testGasPrice, gasPriceMultiplier);

    expect(logs.length).toEqual(0);
    expect(gasPrice).toEqual({ type: 0, gasPrice: multipliedTestGasPrice, gasLimit: gasLimit });
    expect(getGasPrice).toHaveBeenCalledTimes(1);
    expect(getBlock).toHaveBeenCalledTimes(0);
  });

  it('retries once on failure for a non-EIP-1559 provider', async () => {
    const baseOptions = createLegacyBaseOptions();
    const getBlock = baseOptions.provider.getBlock as jest.Mock;

    const getGasPrice = baseOptions.provider.getGasPrice as jest.Mock;
    getGasPrice.mockRejectedValueOnce(new Error('Server is down'));
    getGasPrice.mockResolvedValueOnce(testGasPrice);

    const [logs, gasPrice] = await gasPrices.getProviderGasPrice(baseOptions);

    expect(logs).toEqual([]);
    expect(gasPrice).toEqual({ type: 0, gasPrice: testGasPrice, gasLimit: gasLimit });
    expect(getGasPrice).toHaveBeenCalledTimes(2);
    expect(getBlock).toHaveBeenCalledTimes(0);
  });

  it('retries a maximum of twice then returns null for non-EIP-1559 provider', async () => {
    const baseOptions = createLegacyBaseOptions();
    const getGasPrice = baseOptions.provider.getGasPrice as jest.Mock;
    getGasPrice.mockRejectedValueOnce(new Error('Server is down'));
    getGasPrice.mockRejectedValueOnce(new Error('Server is down'));

    const [logs, gasPrice] = await gasPrices.getProviderGasPrice(baseOptions);

    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: 'All attempts to get legacy gasPrice from provider failed',
      },
    ]);
    expect(gasPrice).toEqual(null);
    expect(baseOptions.provider.getGasPrice).toHaveBeenCalledTimes(2);
    expect(baseOptions.provider.getBlock).toHaveBeenCalledTimes(0);
  });

  createEip1559BaseOptions().forEach((baseOptions: FetchOptions) =>
    it(`retries once on failure for an EIP-1559 provider - test case: %#`, async () => {
      const getGasPrice = baseOptions.provider.getGasPrice as jest.Mock;

      const getBlock = baseOptions.provider.getBlock as jest.Mock;
      getBlock.mockRejectedValueOnce(new Error('Server is down'));
      getBlock.mockResolvedValueOnce({
        baseFeePerGas,
      });

      const [logs, gasPrice] = await gasPrices.getProviderGasPrice(baseOptions);

      expect(logs).toEqual([]);
      expect(gasPrice).toEqual({
        type: 2,
        maxPriorityFeePerGas: maxPriorityFeePerGas,
        maxFeePerGas: maxFeePerGas,
        gasLimit: gasLimit,
      });
      expect(getGasPrice).toHaveBeenCalledTimes(0);
      expect(getBlock).toHaveBeenCalledTimes(2);
    })
  );

  createEip1559BaseOptions().forEach((baseOptions: FetchOptions) =>
    it(`retries a maximum of twice on failure of getBlock for an EIP-1559 provider and then returns null - test case: %#`, async () => {
      const getGasPrice = baseOptions.provider.getGasPrice as jest.Mock;

      const getBlock = baseOptions.provider.getBlock as jest.Mock;
      getBlock.mockRejectedValueOnce(new Error('Server is down'));
      getBlock.mockRejectedValueOnce(new Error('Server is down'));

      const [logs, gasPrice] = await gasPrices.getProviderGasPrice(baseOptions);

      expect(logs).toEqual([
        {
          level: 'ERROR',
          message: 'All attempts to get EIP-1559 gas pricing from provider failed',
        },
      ]);
      expect(gasPrice).toEqual(null);
      expect(getGasPrice).toHaveBeenCalledTimes(0);
      expect(getBlock).toHaveBeenCalledTimes(2);
    })
  );
});
