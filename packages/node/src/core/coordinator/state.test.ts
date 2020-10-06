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

const chains: ChainConfig[] = [
  {
    id: 1,
    type: 'evm',
    providers: [{ name: 'infura-mainnet', url: 'https://mainnet.infura.io/v3/<key>' }],
  },
  {
    id: 3,
    type: 'evm',
    providers: [{ name: 'infura-ropsten', url: 'https://ropsten.infura.io/v3/<key>' }],
  },
];

jest.mock('../config', () => ({
  config: {
    nodeSettings: {
      cloudProvider: 'local:aws',
      chains,
    },
  },
  security: {
    masterKeyMnemonic: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
  },
}));

import { ethers } from 'ethers';
import * as fixtures from 'test/fixtures';
import { AggregatedApiCallsById, ChainConfig, CoordindatorSettings } from 'src/types';
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

    const coordinatorId = '837daEf231';
    const settings: CoordindatorSettings = { logFormat: 'plain' };

    const res = await state.initializeProviders(coordinatorId, chains, settings);
    expect(res).toEqual([
      {
        contracts: {
          Airnode: '<TODO>',
          Convenience: '<TODO>',
          GasPriceFeed: '<TODO>',
        },
        settings: {
          blockHistoryLimit: 600,
          chainId: 1,
          chainType: 'evm',
          logFormat: 'plain',
          minConfirmations: 6,
          name: 'infura-mainnet',
          url: 'https://mainnet.infura.io/v3/<key>',
        },
        coordinatorId,
        currentBlock: 123456,
        gasPrice: null,
        provider,
        walletDataByIndex: {},
      },
      {
        contracts: {
          Airnode: '<TODO>',
          Convenience: '<TODO>',
          GasPriceFeed: '0x3071f278C740B3E3F76301Cf7CAFcdAEB0682565',
        },
        settings: {
          blockHistoryLimit: 600,
          chainId: 3,
          chainType: 'evm',
          logFormat: 'plain',
          minConfirmations: 6,
          name: 'infura-ropsten',
          url: 'https://ropsten.infura.io/v3/<key>',
        },
        coordinatorId,
        currentBlock: 987654,
        gasPrice: null,
        provider,
        walletDataByIndex: {},
      },
    ]);
  });

  it('throws an error if no providers are configured', async () => {
    expect.assertions(1);
    const coordinatorId = '837daEf231';
    const settings: CoordindatorSettings = { logFormat: 'plain' };
    try {
      await state.initializeProviders(coordinatorId, [], settings);
    } catch (e) {
      expect(e).toEqual(new Error('One or more chains must be defined in config.json'));
    }
  });
});

describe('create', () => {
  it('returns a new coordinator state object', () => {
    const res = state.create();
    expect(Object.keys(res).sort()).toEqual(['EVMProviders', 'aggregatedApiCallsById', 'id', 'settings']);
    expect(res.aggregatedApiCallsById).toEqual({});
    expect(res.EVMProviders).toEqual([]);
    expect(res.id.length).toEqual(16);
    expect(res.settings).toEqual({ logFormat: 'plain' });
  });
});

describe('update', () => {
  it('updates and returns the new state', () => {
    const aggregatedApiCallsById: AggregatedApiCallsById = {
      apiCallId: [fixtures.createAggregatedApiCall()],
    };
    const newState = state.create();
    const res = state.update(newState, { aggregatedApiCallsById });
    expect(Object.keys(res).sort()).toEqual(['EVMProviders', 'aggregatedApiCallsById', 'id', 'settings']);
    expect(res.aggregatedApiCallsById).toEqual({ apiCallId: [fixtures.createAggregatedApiCall()] });
    expect(res.EVMProviders).toEqual([]);
    expect(res.id.length).toEqual(16);
    expect(res.settings).toEqual({ logFormat: 'plain' });
  });
});
