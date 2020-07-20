jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ethers: {
      ...original,
      providers: {
        JsonRpcProvider: jest.fn(),
      },
    },
  };
});

const spawnAwsMock = jest.fn();
const spawnLocalAwsMock = jest.fn();
jest.mock('../workers/cloud-platforms/aws', () => ({
  spawn: spawnAwsMock,
  spawnLocal: spawnLocalAwsMock,
}));

import { ethers } from 'ethers';

describe('spawnNewProvider', () => {
  beforeEach(() => jest.resetModules());

  const stateResponse = {
    config: { chainId: 1337, name: 'ganache', url: 'https://...' },
    currentBlock: 1000,
    index: 0,
    gasPrice: null,
    requests: {
      apiCalls: [],
      walletAuthorizations: [],
      withdrawals: [],
    },
  };

  it('handles local AWS calls', async () => {
    const provider = new ethers.providers.JsonRpcProvider();

    const config = { nodeSettings: { cloudProvider: 'local:aws' } };
    jest.mock('../config', () => ({ config }));

    spawnLocalAwsMock.mockResolvedValueOnce(stateResponse);

    const { spawnNewProvider } = require('./worker');

    const res = await spawnNewProvider(0);
    expect(res).toEqual({ ...stateResponse, provider });

    expect(spawnLocalAwsMock).toHaveBeenCalledTimes(1);
    expect(spawnLocalAwsMock).toHaveBeenCalledWith({
      functionName: 'initializeProvider',
      payload: {
        pathParameters: { index: 0 }
      },
    });
  });

  it('handles remote AWS calls', async () => {
    const provider = new ethers.providers.JsonRpcProvider();

    const config = { nodeSettings: { cloudProvider: 'aws' } };
    jest.mock('../config/index', () => ({ config }));

    spawnAwsMock.mockResolvedValueOnce(stateResponse);

    const { spawnNewProvider } = require('./worker');

    const res = await spawnNewProvider(0);
    expect(res).toEqual({ ...stateResponse, provider });

    expect(spawnAwsMock).toHaveBeenCalledTimes(1);
    expect(spawnAwsMock).toHaveBeenCalledWith({
      functionName: 'initializeProvider',
      payload: { index: 0 },
    });
  });
});
