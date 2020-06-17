const latestAnswerMock = jest.fn();

jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ethers: {
      ...original,
      providers: {
        JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
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
import * as gasPrices from './gas-prices';

describe('getMaxGweiGasPrice', () => {
  it('returns the highest gas price from the available APIs', async () => {
    const getMock = http.get as jest.Mock;
    getMock.mockResolvedValueOnce({ data: { fast: '45.0' } });
    getMock.mockResolvedValueOnce({ data: { fast: 460 } });
    getMock.mockResolvedValueOnce({ data: { fast: 42 } });
    getMock.mockResolvedValueOnce({ data: { fast: 43 } });

    const contract = new ethers.Contract('address', ['ABI']);
    contract.latestAnswer.mockResolvedValueOnce(43000000000);

    const gasPrice = await gasPrices.getMaxGweiGasPrice();
    expect(gasPrice).toEqual(46);
  });

  it('takes the gas price feed price if it is highest', async () => {
    const getMock = http.get as jest.Mock;
    getMock.mockResolvedValueOnce({ data: { fast: '45.0' } });
    getMock.mockResolvedValueOnce({ data: { fast: 460 } });
    getMock.mockResolvedValueOnce({ data: { fast: 42 } });
    getMock.mockResolvedValueOnce({ data: { fast: 43 } });

    const contract = new ethers.Contract('address', ['ABI']);
    contract.latestAnswer.mockResolvedValueOnce(53000000000);

    const gasPrice = await gasPrices.getMaxGweiGasPrice();
    expect(gasPrice).toEqual(53);
  });

  it('returns a gas price even if one or more APIs fail', async () => {
    const getMock = http.get as jest.Mock;
    getMock.mockRejectedValueOnce(new Error('Computer says no'));
    getMock.mockResolvedValueOnce({ data: { fast: 460 } });
    getMock.mockRejectedValueOnce(new Error('Computer says no'));
    getMock.mockResolvedValueOnce({ data: { fast: 43 } });

    const contract = new ethers.Contract('address', ['ABI']);
    contract.latestAnswer.mockResolvedValueOnce(43000000000);

    const gasPrice = await gasPrices.getMaxGweiGasPrice();
    expect(gasPrice).toEqual(46);
  });

  it('ignores APIs that return a value that cannot be used', async () => {
    const getMock = http.get as jest.Mock;
    getMock.mockResolvedValueOnce({ data: { fast: 'helloworld' } });
    getMock.mockResolvedValueOnce({ data: { fast: 460 } });
    getMock.mockRejectedValueOnce(new Error('Computer says no'));
    getMock.mockResolvedValueOnce({ data: { fast: 43 } });

    const contract = new ethers.Contract('address', ['ABI']);
    contract.latestAnswer.mockResolvedValueOnce(43000000000);

    const gasPrice = await gasPrices.getMaxGweiGasPrice();
    expect(gasPrice).toEqual(46);
  });

  it('returns the fallback price is no usable responses are received', async () => {
    const getMock = http.get as jest.Mock;
    getMock.mockRejectedValueOnce(new Error('Computer says no'));
    getMock.mockRejectedValueOnce(new Error('Computer says no'));
    getMock.mockRejectedValueOnce(new Error('Computer says no'));
    getMock.mockRejectedValueOnce(new Error('Computer says no'));

    const contract = new ethers.Contract('address', ['ABI']);
    contract.latestAnswer.mockRejectedValueOnce(new Error('Contract says no'));

    const gasPrice = await gasPrices.getMaxGweiGasPrice();
    expect(gasPrice).toEqual(40);
  });

  it('limits the maximum gas price that can be returned', async () => {
    const getMock = http.get as jest.Mock;
    getMock.mockResolvedValueOnce({ data: { fast: '45.0' } });
    getMock.mockResolvedValueOnce({ data: { fast: 460 } });
    getMock.mockResolvedValueOnce({ data: { fast: 4200 } });
    getMock.mockResolvedValueOnce({ data: { fast: 43 } });

    const contract = new ethers.Contract('address', ['ABI']);
    contract.latestAnswer.mockResolvedValueOnce(43000000000);

    const gasPrice = await gasPrices.getMaxGweiGasPrice();
    expect(gasPrice).toEqual(1000);
  });
});
