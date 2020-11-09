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
import * as worker from './worker';

describe('spawnNewProvider', () => {
  it('handles local AWS calls', async () => {
    const provider = new ethers.providers.JsonRpcProvider();
    const nodeSettings = fixtures.buildNodeSettings({ cloudProvider: 'local:aws' });
    const config = fixtures.buildConfig({ nodeSettings });
    const state = fixtures.buildEVMProviderState({ config });
    spawnLocalAwsMock.mockResolvedValueOnce(state);
    const res = await worker.spawnNewProvider(config, state);
    expect(res).toEqual({ ...state, provider });
    expect(spawnLocalAwsMock).toHaveBeenCalledTimes(1);
    expect(spawnLocalAwsMock).toHaveBeenCalledWith({
      config,
      functionName: 'initializeProvider',
      payload: {
        state: { ...state, config },
      },
    });
  });

  it('handles remote AWS calls', async () => {
    const provider = new ethers.providers.JsonRpcProvider();
    const nodeSettings = fixtures.buildNodeSettings({ cloudProvider: 'aws' });
    const config = fixtures.buildConfig({ nodeSettings });
    const state = fixtures.buildEVMProviderState({ config });
    spawnAwsMock.mockResolvedValueOnce(state);
    const res = await worker.spawnNewProvider(config, state);
    expect(res).toEqual({ ...state, provider });
    expect(spawnAwsMock).toHaveBeenCalledTimes(1);
    expect(spawnAwsMock).toHaveBeenCalledWith({
      config,
      functionName: 'initializeProvider',
      payload: { state: { ...state, config } },
    });
  });
});
