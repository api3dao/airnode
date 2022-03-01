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
import { FetchOptions } from './gas-prices';
import { BASE_FEE_MULTIPLIER, PRIORITY_FEE } from '../constants';

const createLegacyBaseOptions = (): FetchOptions => ({
  provider: new ethers.providers.JsonRpcProvider(),
  chainOptions: {
    txType: 'legacy',
  },
});

const createEip1559BaseOptions = () => {
  const provider = new ethers.providers.JsonRpcProvider();

  const eip1559ChainOptions = [
    {
      txType: 'eip1559',
      baseFeeMultiplier: BASE_FEE_MULTIPLIER.toString(),
      priorityFee: {
        value: '3.12',
        unit: 'gwei',
      },
    },
    {
      txType: 'eip1559',
      baseFeeMultiplier: undefined,
      priorityFee: {
        value: '3.12',
        unit: 'gwei',
      },
    },
    {
      txType: 'eip1559',
      baseFeeMultiplier: BASE_FEE_MULTIPLIER.toString(),
      priorityFee: undefined,
    },
    {
      txType: 'eip1559',
      baseFeeMultiplier: undefined,
      priorityFee: undefined,
    },
  ] as const;

  return eip1559ChainOptions.map((chainOptions) => ({ provider, chainOptions }));
};

describe('parsePriorityFee', () => {
  test.each([
    [{ value: '123', unit: 'wei' }, BigNumber.from('123')],
    [{ value: '123' }, BigNumber.from('123')],
    [{ value: '123.4', unit: 'kwei' }, BigNumber.from('123400')],
    [{ value: '123.4', unit: 'mwei' }, BigNumber.from('123400000')],
    [{ value: '123.4', unit: 'gwei' }, BigNumber.from('123400000000')],
    [{ value: '123.4', unit: 'szabo' }, BigNumber.from('123400000000000')],
    [{ value: '123.4', unit: 'finney' }, BigNumber.from('123400000000000000')],
    [{ value: '123.4', unit: 'ether' }, BigNumber.from('123400000000000000000')],
  ])('returns parsed wei from decimal denominated string - %#', (input: any, result: BigNumber) => {
    const priorityFeeInWei = gasPrices.parsePriorityFee(input);
    expect(priorityFeeInWei).toEqual(result);
  });

  test.each([
    { value: '3.12', unit: 'pence' },
    { value: '3.1p', unit: 'gwei' },
    { value: '3.12', unit: 'wei' },
  ])('throws an error for an invalid decimal denominated string - %#', (input: any) => {
    const throwingFunction = () => gasPrices.parsePriorityFee(input);
    expect(throwingFunction).toThrow();
  });
});

describe('getGasPrice', () => {
  const baseFeePerGas = ethers.BigNumber.from('93000000000');
  const maxPriorityFeePerGas = BigNumber.from(PRIORITY_FEE);
  const maxFeePerGas = baseFeePerGas.mul(BASE_FEE_MULTIPLIER).add(maxPriorityFeePerGas);
  const testGasPrice = ethers.BigNumber.from('48000000000');

  test.each(createEip1559BaseOptions())(
    `returns the gas price from an EIP-1559 provider - test case: %#`,
    async (baseOptions: FetchOptions) => {
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
    const baseOptions = createLegacyBaseOptions();
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
    const baseOptions = createLegacyBaseOptions();
    const getBlock = baseOptions.provider.getBlock as jest.Mock;

    const getGasPrice = baseOptions.provider.getGasPrice as jest.Mock;
    getGasPrice.mockRejectedValueOnce(new Error('Server is down'));
    getGasPrice.mockResolvedValueOnce(testGasPrice);

    const [logs, gasPrice] = await gasPrices.getGasPrice(baseOptions);

    expect(logs).toEqual([]);
    expect(gasPrice).toEqual({ gasPrice: testGasPrice });
    expect(getGasPrice).toHaveBeenCalledTimes(2);
    expect(getBlock).toHaveBeenCalledTimes(0);
  });

  it('retries a maximum of twice then returns null for non-EIP-1559 provider', async () => {
    const baseOptions = createLegacyBaseOptions();
    const getGasPrice = baseOptions.provider.getGasPrice as jest.Mock;
    getGasPrice.mockRejectedValueOnce(new Error('Server is down'));
    getGasPrice.mockRejectedValueOnce(new Error('Server is down'));

    const [logs, gasPrice] = await gasPrices.getGasPrice(baseOptions);

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

  test.each(createEip1559BaseOptions())(
    `retries once on failure for an EIP-1559 provider - test case: %#`,
    async (baseOptions: FetchOptions) => {
      const getGasPrice = baseOptions.provider.getGasPrice as jest.Mock;

      const getBlock = baseOptions.provider.getBlock as jest.Mock;
      getBlock.mockRejectedValueOnce(new Error('Server is down'));
      getBlock.mockResolvedValueOnce({
        baseFeePerGas,
      });

      const [logs, gasPrice] = await gasPrices.getGasPrice(baseOptions);

      expect(logs).toEqual([]);
      expect(gasPrice?.maxPriorityFeePerGas).toEqual(maxPriorityFeePerGas);
      expect(gasPrice?.maxFeePerGas).toEqual(maxFeePerGas);
      expect(getGasPrice).toHaveBeenCalledTimes(0);
      expect(getBlock).toHaveBeenCalledTimes(2);
    }
  );

  test.each(createEip1559BaseOptions())(
    `retries a maximum of twice on failure of getBlock for an EIP-1559 provider and then returns null - test case: %#`,
    async (baseOptions: FetchOptions) => {
      const getGasPrice = baseOptions.provider.getGasPrice as jest.Mock;

      const getBlock = baseOptions.provider.getBlock as jest.Mock;
      getBlock.mockRejectedValueOnce(new Error('Server is down'));
      getBlock.mockRejectedValueOnce(new Error('Server is down'));

      const [logs, gasPrice] = await gasPrices.getGasPrice(baseOptions);

      expect(logs).toEqual([
        {
          level: 'ERROR',
          message: 'All attempts to get EIP-1559 gas pricing from provider failed',
        },
      ]);
      expect(gasPrice).toEqual(null);
      expect(getGasPrice).toHaveBeenCalledTimes(0);
      expect(getBlock).toHaveBeenCalledTimes(2);
    }
  );
});
