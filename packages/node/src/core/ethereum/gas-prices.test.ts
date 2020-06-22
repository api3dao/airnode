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

jest.mock('../clients/http', () => ({ get: jest.fn() }));

import { ethers } from 'ethers';
import * as http from '../clients/http';
import { State } from '../state';
import * as utils from './utils';
import * as gasPrices from './gas-prices';

describe('getGasPrice', () => {
  const state: State = {
    chainId: 3,
    currentBlock: null,
    provider: new ethers.providers.JsonRpcProvider(),
    gasPrice: null,
  };

  it('returns the highest gas price from the available APIs', async () => {
    const getMock = http.get as jest.Mock;
    getMock.mockResolvedValueOnce({ data: { fast: '45.0' } });
    getMock.mockResolvedValueOnce({ data: { fast: 460 } });
    getMock.mockResolvedValueOnce({ data: { fast: 42 } });
    getMock.mockResolvedValueOnce({ data: { fast: 43 } });

    const contract = new ethers.Contract('address', ['ABI']);
    contract.latestAnswer.mockResolvedValueOnce(43000000000);

    const gasPrice = await gasPrices.getGasPrice(state);
    expect(utils.weiToGwei(gasPrice)).toEqual('46.0');
  });

  it('takes the gas price feed price if it is highest', async () => {
    const getMock = http.get as jest.Mock;
    getMock.mockResolvedValueOnce({ data: { fast: '45.0' } });
    getMock.mockResolvedValueOnce({ data: { fast: 460 } });
    getMock.mockResolvedValueOnce({ data: { fast: 42 } });
    getMock.mockResolvedValueOnce({ data: { fast: 43 } });

    const contract = new ethers.Contract('address', ['ABI']);
    contract.latestAnswer.mockResolvedValueOnce(53000000000);

    const gasPrice = await gasPrices.getGasPrice(state);
    expect(utils.weiToGwei(gasPrice)).toEqual('53.0');
  });

  it('returns a gas price even if one or more APIs fail', async () => {
    const getMock = http.get as jest.Mock;
    getMock.mockRejectedValueOnce(new Error('Computer says no'));
    getMock.mockResolvedValueOnce({ data: { fast: 460 } });
    getMock.mockRejectedValueOnce(new Error('Computer says no'));
    getMock.mockResolvedValueOnce({ data: { fast: 43 } });

    const contract = new ethers.Contract('address', ['ABI']);
    contract.latestAnswer.mockResolvedValueOnce(43000000000);

    const gasPrice = await gasPrices.getGasPrice(state);
    expect(utils.weiToGwei(gasPrice)).toEqual('46.0');
  });

  it('ignores APIs that return a value that cannot be used', async () => {
    const getMock = http.get as jest.Mock;
    getMock.mockResolvedValueOnce({ data: { fast: 'helloworld' } });
    getMock.mockResolvedValueOnce({ data: { fast: 460 } });
    getMock.mockRejectedValueOnce(new Error('Computer says no'));
    getMock.mockResolvedValueOnce({ data: { fast: 43 } });

    const contract = new ethers.Contract('address', ['ABI']);
    contract.latestAnswer.mockResolvedValueOnce(43000000000);

    const gasPrice = await gasPrices.getGasPrice(state);
    expect(utils.weiToGwei(gasPrice)).toEqual('46.0');
  });

  it('returns the gas price from the Ethereum node if no successful responses are received', async () => {
    const getMock = http.get as jest.Mock;
    getMock.mockRejectedValueOnce(new Error('Computer says no'));
    getMock.mockRejectedValueOnce(new Error('Computer says no'));
    getMock.mockRejectedValueOnce(new Error('Computer says no'));
    getMock.mockRejectedValueOnce(new Error('Computer says no'));

    const contract = new ethers.Contract('address', ['ABI']);
    contract.latestAnswer.mockRejectedValueOnce(new Error('Contract says no'));

    const getGasPrice = state.provider.getGasPrice as jest.Mock;
    getGasPrice.mockResolvedValueOnce(48000000000);

    const gasPrice = await gasPrices.getGasPrice(state);
    expect(utils.weiToGwei(gasPrice)).toEqual('48.0');
  });

  it('returns the fallback price if no usable responses are received from any sources', async () => {
    const getMock = http.get as jest.Mock;
    getMock.mockRejectedValueOnce(new Error('Computer says no'));
    getMock.mockRejectedValueOnce(new Error('Computer says no'));
    getMock.mockRejectedValueOnce(new Error('Computer says no'));
    getMock.mockRejectedValueOnce(new Error('Computer says no'));

    const contract = new ethers.Contract('address', ['ABI']);
    contract.latestAnswer.mockRejectedValueOnce(new Error('Contract says no'));

    const getGasPrice = state.provider.getGasPrice as jest.Mock;
    getGasPrice.mockRejectedValueOnce(new Error('Node says no'));

    const gasPrice = await gasPrices.getGasPrice(state);
    expect(utils.weiToGwei(gasPrice)).toEqual('40.0');
  });

  it('limits the maximum gas price that can be returned', async () => {
    const getMock = http.get as jest.Mock;
    getMock.mockResolvedValueOnce({ data: { fast: '45.0' } });
    getMock.mockResolvedValueOnce({ data: { fast: 460 } });
    getMock.mockResolvedValueOnce({ data: { fast: 4200 } });
    getMock.mockResolvedValueOnce({ data: { fast: 43 } });

    const contract = new ethers.Contract('address', ['ABI']);
    contract.latestAnswer.mockResolvedValueOnce(43000000000);

    const gasPrice = await gasPrices.getGasPrice(state);
    expect(utils.weiToGwei(gasPrice)).toEqual('1000.0');
  });
});
