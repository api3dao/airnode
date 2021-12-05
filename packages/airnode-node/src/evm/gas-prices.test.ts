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

import { ethers } from 'ethers';
import * as gasPrices from './gas-prices';
import { BASE_FEE_MULTIPLIER, PRIORITY_FEE, WEI_PER_GWEI } from '../constants';

describe('getGasPrice', () => {
  const baseOptions = {
    provider: new ethers.providers.JsonRpcProvider(),
  };

  const baseFeePerGas = ethers.BigNumber.from('93000000000');
  const maxPriorityFeePerGas = ethers.utils
    .parseEther(PRIORITY_FEE)
    .div(ethers.constants.WeiPerEther)
    .div(WEI_PER_GWEI);
  const maxFeePerGas = baseFeePerGas.mul(BASE_FEE_MULTIPLIER).div(100).add(maxPriorityFeePerGas);
  const testGasPrice = ethers.BigNumber.from('48000000000');

  it('returns the gas price from an EIP-1559 provider', async () => {
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
  });

  it('returns the gas price from a non-EIP-1559 provider', async () => {
    const getBlock = baseOptions.provider.getBlock as jest.Mock;
    getBlock.mockResolvedValueOnce({});

    const getGasPrice = baseOptions.provider.getGasPrice as jest.Mock;
    getGasPrice.mockResolvedValueOnce(testGasPrice);

    const [logs, gasPrice] = await gasPrices.getGasPrice(baseOptions);

    expect(logs.length).toEqual(1);
    expect(gasPrice).toEqual({ gasPrice: testGasPrice });
    expect(getGasPrice).toHaveBeenCalledTimes(1);
  });

  it('retries once on failure for a non-EIP-1559 provider', async () => {
    const getBlock = baseOptions.provider.getBlock as jest.Mock;
    getBlock.mockResolvedValueOnce({});

    const getGasPrice = baseOptions.provider.getGasPrice as jest.Mock;
    getGasPrice.mockRejectedValueOnce(new Error('Server is down'));
    getGasPrice.mockResolvedValueOnce(testGasPrice);

    const [logs, gasPrice] = await gasPrices.getGasPrice(baseOptions);

    expect(logs.length).toEqual(1);
    expect(gasPrice).toEqual({ gasPrice: testGasPrice });
    expect(baseOptions.provider.getBlock).toHaveBeenCalledTimes(1);
    expect(baseOptions.provider.getGasPrice).toHaveBeenCalledTimes(2);
  });

  it('retries a maximum of twice then returns null for non-EIP-1559 provider', async () => {
    const getBlock = baseOptions.provider.getBlock as jest.Mock;
    getBlock.mockResolvedValueOnce({});

    const getGasPrice = baseOptions.provider.getGasPrice as jest.Mock;
    getGasPrice.mockRejectedValueOnce(new Error('Server is down'));
    getGasPrice.mockRejectedValueOnce(new Error('Server is down'));

    const [logs, gasPrice] = await gasPrices.getGasPrice(baseOptions);

    expect(logs).toEqual([
      { level: 'INFO', message: 'Failed to get EIP-1559 gas pricing from provider - trying fallback' },
      { level: 'ERROR', message: 'Failed to get fallback gas price from provider', error: new Error('Server is down') },
    ]);
    expect(gasPrice).toEqual(null);
    expect(baseOptions.provider.getGasPrice).toHaveBeenCalledTimes(2);
    expect(baseOptions.provider.getBlock).toHaveBeenCalledTimes(1);
  });

  it('retries once on failure for an EIP-1559 provider', async () => {
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
  });

  it('retries a maximum of twice on failure of getBlock for an EIP-1559 provider and then returns null', async () => {
    const getGasPrice = baseOptions.provider.getGasPrice as jest.Mock;
    getGasPrice.mockRejectedValueOnce(new Error('Server is down'));
    getGasPrice.mockRejectedValueOnce(new Error('Server is down'));

    const getBlock = baseOptions.provider.getBlock as jest.Mock;
    getBlock.mockRejectedValueOnce(new Error('Server is down'));
    getBlock.mockRejectedValueOnce(new Error('Server is down'));

    const [logs, gasPrice] = await gasPrices.getGasPrice(baseOptions);

    expect(logs).toEqual([
      {
        error: new Error('Server is down'),
        level: 'INFO',
        message: 'Failed to get EIP-1559 gas pricing from provider - trying fallback',
      },
      {
        error: new Error('Server is down'),
        level: 'ERROR',
        message: 'Failed to get fallback gas price from provider',
      },
    ]);
    expect(gasPrice).toEqual(null);
    expect(getGasPrice).toHaveBeenCalledTimes(2);
    expect(getBlock).toHaveBeenCalledTimes(2);
  });
});
