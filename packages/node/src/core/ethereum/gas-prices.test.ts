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
import { ProviderState } from '../../types';
import * as utils from './utils';
import * as gasPrices from './gas-prices';

describe('getGasPrice', () => {
  const state: ProviderState = {
    config: { chainId: 3, name: 'infura-ropsten', url: 'https://ropsten.infura.io/v3/<my-key>' },
    currentBlock: 123456,
    gasPrice: null,
    nonce: null,
    provider: new ethers.providers.JsonRpcProvider(),
    requests: {
      apiCalls: [],
    },
  };

  it('takes the gas price feed price if it is highest', async () => {
    const contract = new ethers.Contract('address', ['ABI']);
    contract.latestAnswer.mockResolvedValueOnce(utils.weiToBigNumber('53000000000'));

    const getGasPrice = state.provider.getGasPrice as jest.Mock;
    getGasPrice.mockResolvedValueOnce(utils.weiToBigNumber('48000000000'));

    const gasPrice = await gasPrices.getGasPrice(state);
    expect(utils.weiToGwei(gasPrice)).toEqual('53.0');
  });

  it('takes the node price if it is highest', async () => {
    const contract = new ethers.Contract('address', ['ABI']);
    contract.latestAnswer.mockResolvedValueOnce(utils.weiToBigNumber('53000000000'));

    const getGasPrice = state.provider.getGasPrice as jest.Mock;
    getGasPrice.mockResolvedValueOnce(utils.weiToBigNumber('55000000000'));

    const gasPrice = await gasPrices.getGasPrice(state);
    expect(utils.weiToGwei(gasPrice)).toEqual('55.0');
  });

  it('returns the fallback price if no usable responses are received from any sources', async () => {
    const contract = new ethers.Contract('address', ['ABI']);
    contract.latestAnswer.mockRejectedValueOnce(new Error('Contract says no'));

    const getGasPrice = state.provider.getGasPrice as jest.Mock;
    getGasPrice.mockRejectedValueOnce(new Error('Node says no'));

    const gasPrice = await gasPrices.getGasPrice(state);
    expect(utils.weiToGwei(gasPrice)).toEqual('40.0');
  });

  it('limits the maximum gas price that can be returned', async () => {
    const contract = new ethers.Contract('address', ['ABI']);
    contract.latestAnswer.mockResolvedValueOnce(utils.weiToBigNumber('43000000000000'));

    const getGasPrice = state.provider.getGasPrice as jest.Mock;
    getGasPrice.mockResolvedValueOnce(utils.weiToBigNumber('48000000000'));

    const gasPrice = await gasPrices.getGasPrice(state);
    expect(utils.weiToGwei(gasPrice)).toEqual('1000.0');
  });
});
