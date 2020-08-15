const getBlockNumberMock = jest.fn();
const getLogsMock = jest.fn();
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ethers: {
      ...original,
      providers: {
        JsonRpcProvider: jest.fn().mockImplementation(() => ({
          getBlockNumber: getBlockNumberMock,
          getLogs: getLogsMock,
        })),
      },
    },
  };
});

const ethereumProviders: ProviderConfig[] = [
  { chainId: 3, name: 'infura-ropsten', url: 'https://ropsten.eth' },
  { chainId: 1, name: 'infura-mainnet', url: 'https://mainnet.eth' },
];

jest.mock('../config', () => ({
  config: {
    nodeSettings: {
      cloudProvider: 'local:aws',
      ethereumProviders: ethereumProviders,
    },
  },
  security: {
    masterKeyMnemonic: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
  },
}));

import { ethers } from 'ethers';
import { AggregatedApiCall, ProviderConfig } from '../../types';
import * as state from './state';

describe('initializeProviders', () => {
  it('sets the initial state for each provider', async () => {
    const provider = new ethers.providers.JsonRpcProvider();

    const getBlockNumber = provider.getBlockNumber as jest.Mock;
    getBlockNumber.mockResolvedValueOnce(123456);
    getBlockNumber.mockResolvedValueOnce(987654);

    const getLogs = provider.getLogs as jest.Mock;
    getLogs.mockResolvedValueOnce([]);
    getLogs.mockResolvedValueOnce([]);

    const res = await state.initializeProviders(ethereumProviders);
    expect(res).toEqual([
      {
        config: ethereumProviders[0],
        currentBlock: 123456,
        gasPrice: null,
        index: 0,
        provider,
        requests: {
          apiCalls: [],
          walletDesignations: [],
          withdrawals: [],
        },
        transactionCountsByWalletIndex: {},
        xpub:
          'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
      },
      {
        config: ethereumProviders[1],
        currentBlock: 987654,
        gasPrice: null,
        index: 1,
        provider,
        requests: {
          apiCalls: [],
          walletDesignations: [],
          withdrawals: [],
        },
        transactionCountsByWalletIndex: {},
        xpub:
          'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
      },
    ]);
  });

  it('throws an error if no providers are configured', async () => {
    expect.assertions(1);
    try {
      await state.initializeProviders([]);
    } catch (e) {
      expect(e).toEqual(new Error('At least one provider must be defined in config.json'));
    }
  });
});

describe('create', () => {
  it('returns a new coordinator state object', () => {
    const res = state.create();
    expect(res).toEqual({
      aggregatedApiCalls: [],
      providers: [],
    });
  });
});

describe('update', () => {
  it('updates and returns the new state', () => {
    const aggregatedApiCalls: AggregatedApiCall[] = [
      {
        id: '0x123',
        endpointId: '0xendpointId',
        parameters: { from: 'ETH ' },
        providers: [0, 1],
        type: 'request',
      },
    ];
    const newState = state.create();
    const res = state.update(newState, { aggregatedApiCalls });
    expect(res).toEqual({
      aggregatedApiCalls: [
        {
          id: '0x123',
          endpointId: '0xendpointId',
          parameters: { from: 'ETH ' },
          providers: [0, 1],
          type: 'request',
        },
      ],
      providers: [],
    });
  });
});
