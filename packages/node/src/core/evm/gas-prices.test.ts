const getGasPriceMock = jest.fn();
const latestAnswerMock = jest.fn();
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ethers: {
      ...original,
      providers: {
        JsonRpcProvider: jest.fn().mockImplementation(() => ({
          getGasPrice: getGasPriceMock,
        })),
      },
      Contract: jest.fn().mockImplementation(() => ({
        latestAnswer: latestAnswerMock,
      })),
    },
  };
});

import { ethers } from 'ethers';
import * as gasPrices from './gas-prices';

describe('getGasPrice', () => {
  const baseOptions = {
    provider: new ethers.providers.JsonRpcProvider(),
  };

  it('returns the gas price from the provider', async () => {
    const getGasPrice = baseOptions.provider.getGasPrice as jest.Mock;
    getGasPrice.mockResolvedValueOnce(ethers.BigNumber.from('48000000000'));
    const [logs, gasPrice] = await gasPrices.getGasPrice(baseOptions);
    expect(logs).toEqual([]);
    expect(gasPrice).toEqual(ethers.BigNumber.from('48000000000'));
    expect(baseOptions.provider.getGasPrice).toHaveBeenCalledTimes(1);
  });

  it('retries once on failure', async () => {
    const getGasPrice = baseOptions.provider.getGasPrice as jest.Mock;
    getGasPrice.mockRejectedValueOnce(new Error('Server is down'));
    getGasPrice.mockResolvedValueOnce(ethers.BigNumber.from('53000000000'));
    const [logs, gasPrice] = await gasPrices.getGasPrice(baseOptions);
    expect(logs).toEqual([]);
    expect(gasPrice).toEqual(ethers.BigNumber.from('53000000000'));
    expect(baseOptions.provider.getGasPrice).toHaveBeenCalledTimes(2);
  });

  it('retries a maximum of two times then returns null', async () => {
    const getGasPrice = baseOptions.provider.getGasPrice as jest.Mock;
    getGasPrice.mockRejectedValueOnce(new Error('Server is down'));
    getGasPrice.mockRejectedValueOnce(new Error('Server is down'));
    const [logs, gasPrice] = await gasPrices.getGasPrice(baseOptions);
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Failed to get gas price from provider', error: new Error('Server is down') },
    ]);
    expect(gasPrice).toEqual(null);
    expect(baseOptions.provider.getGasPrice).toHaveBeenCalledTimes(2);
  });
});
