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
import * as fixtures from 'test/fixtures';

describe('spawnNewProvider', () => {
  beforeEach(() => jest.resetModules());

  it('handles local AWS calls', async () => {
    const provider = new ethers.providers.JsonRpcProvider();
    const config = { nodeSettings: { cloudProvider: 'local:aws' } };
    jest.mock('../config', () => ({ config }));
    const state = fixtures.createEVMProviderState();
    spawnLocalAwsMock.mockResolvedValueOnce(state);
    const { spawnNewProvider } = require('./worker');
    const res = await spawnNewProvider(state);
    expect(res).toEqual({ ...state, provider });
    expect(spawnLocalAwsMock).toHaveBeenCalledTimes(1);
    expect(spawnLocalAwsMock).toHaveBeenCalledWith({
      functionName: 'airnode-9e5a89d-dev-initializeProvider',
      payload: {
        parameters: { state },
      },
    });
  });

  it('handles remote AWS calls', async () => {
    const provider = new ethers.providers.JsonRpcProvider();
    const config = { nodeSettings: { cloudProvider: 'aws' } };
    jest.mock('../config/index', () => ({ config }));
    const state = fixtures.createEVMProviderState();
    spawnAwsMock.mockResolvedValueOnce(state);
    const { spawnNewProvider } = require('./worker');
    const res = await spawnNewProvider(state);
    expect(res).toEqual({ ...state, provider });
    expect(spawnAwsMock).toHaveBeenCalledTimes(1);
    expect(spawnAwsMock).toHaveBeenCalledWith({
      functionName: 'airnode-9e5a89d-dev-initializeProvider',
      payload: {
        parameters: { state },
      },
    });
  });
});
