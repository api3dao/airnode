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
import * as utils from './utils';
import * as gasPrices from './gas-prices';

describe('getGasPrice', () => {
  const baseOptions = {
    address: '0x3071f278C740B3E3F76301Cf7CAFcdAEB0682565',
  };

  it('only checks the node price if the contract address is AddressZero', async () => {
    const provider = new ethers.providers.JsonRpcProvider();
    const contract = new ethers.Contract('address', ['ABI']);
    const getGasPrice = provider.getGasPrice as jest.Mock;
    getGasPrice.mockResolvedValueOnce(utils.weiToBigNumber('48000000000'));
    const options = { ...baseOptions, address: ethers.constants.AddressZero, provider };
    const [logs, gasPrice] = await gasPrices.getGasPrice(options);
    expect(logs).toEqual([]);
    expect(utils.weiToGwei(gasPrice)).toEqual('48.0');
    expect(provider.getGasPrice).toHaveBeenCalledTimes(1);
    expect(contract.latestAnswer).not.toHaveBeenCalled();
  });

  it('takes the gas price feed price if it is highest', async () => {
    const provider = new ethers.providers.JsonRpcProvider();
    const contract = new ethers.Contract('address', ['ABI']);
    contract.latestAnswer.mockResolvedValueOnce(utils.weiToBigNumber('53000000000'));
    const getGasPrice = provider.getGasPrice as jest.Mock;
    getGasPrice.mockResolvedValueOnce(utils.weiToBigNumber('48000000000'));
    const [logs, gasPrice] = await gasPrices.getGasPrice({ ...baseOptions, provider });
    expect(logs).toEqual([]);
    expect(utils.weiToGwei(gasPrice)).toEqual('53.0');
    expect(provider.getGasPrice).toHaveBeenCalledTimes(1);
    expect(contract.latestAnswer).toHaveBeenCalledTimes(1);
  });

  it('takes the node price if it is highest', async () => {
    const provider = new ethers.providers.JsonRpcProvider();
    const contract = new ethers.Contract('address', ['ABI']);
    contract.latestAnswer.mockResolvedValueOnce(utils.weiToBigNumber('53000000000'));
    const getGasPrice = provider.getGasPrice as jest.Mock;
    getGasPrice.mockResolvedValueOnce(utils.weiToBigNumber('55000000000'));
    const [logs, gasPrice] = await gasPrices.getGasPrice({ ...baseOptions, provider });
    expect(logs).toEqual([]);
    expect(utils.weiToGwei(gasPrice)).toEqual('55.0');
    expect(provider.getGasPrice).toHaveBeenCalledTimes(1);
    expect(contract.latestAnswer).toHaveBeenCalledTimes(1);
  });

  it('returns the fallback price if no usable responses are received from any sources', async () => {
    const provider = new ethers.providers.JsonRpcProvider();
    const contract = new ethers.Contract('address', ['ABI']);
    contract.latestAnswer.mockRejectedValueOnce(new Error('Contract says no'));
    const getGasPrice = provider.getGasPrice as jest.Mock;
    getGasPrice.mockRejectedValueOnce(new Error('Node says no'));
    const [logs, gasPrice] = await gasPrices.getGasPrice({ ...baseOptions, provider });
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Failed to get gas price from Ethereum node', error: new Error('Node says no') },
      {
        level: 'ERROR',
        message: 'Failed to get gas price from gas price feed contract',
        error: new Error('Contract says no'),
      },
      { level: 'ERROR', message: 'Failed to get gas prices from any sources. Falling back to default price 40.0 Gwei' },
    ]);
    expect(utils.weiToGwei(gasPrice)).toEqual('40.0');
    expect(provider.getGasPrice).toHaveBeenCalledTimes(1);
    expect(contract.latestAnswer).toHaveBeenCalledTimes(1);
  });

  it('limits the maximum gas price that can be returned', async () => {
    const provider = new ethers.providers.JsonRpcProvider();
    const contract = new ethers.Contract('address', ['ABI']);
    contract.latestAnswer.mockResolvedValueOnce(utils.weiToBigNumber('43000000000000'));
    const getGasPrice = provider.getGasPrice as jest.Mock;
    getGasPrice.mockResolvedValueOnce(utils.weiToBigNumber('48000000000'));
    const [logs, gasPrice] = await gasPrices.getGasPrice({ ...baseOptions, provider });
    expect(logs).toEqual([]);
    expect(utils.weiToGwei(gasPrice)).toEqual('1000.0');
    expect(provider.getGasPrice).toHaveBeenCalledTimes(1);
    expect(contract.latestAnswer).toHaveBeenCalledTimes(1);
  });
});
