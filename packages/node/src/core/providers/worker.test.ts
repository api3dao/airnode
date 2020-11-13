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
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: 'local:aws' });
    const state = fixtures.buildEVMProviderState();
    spawnLocalAwsMock.mockResolvedValueOnce(state);
    const res = await worker.spawnNewProvider(state, workerOpts);
    expect(res).toEqual({ ...state, provider });
    expect(spawnLocalAwsMock).toHaveBeenCalledTimes(1);
    expect(spawnLocalAwsMock).toHaveBeenCalledWith({
      cloudProvider: 'local:aws',
      functionName: 'initializeProvider',
      payload: { state },
      providerIdShort: '19255a4',
      region: 'us-east-1',
      stage: 'test',
    });
  });

  it('handles remote AWS calls', async () => {
    const provider = new ethers.providers.JsonRpcProvider();
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: 'aws' });
    const state = fixtures.buildEVMProviderState();
    spawnAwsMock.mockResolvedValueOnce(state);
    const res = await worker.spawnNewProvider(state, workerOpts);
    expect(res).toEqual({ ...state, provider });
    expect(spawnAwsMock).toHaveBeenCalledTimes(1);
    expect(spawnAwsMock).toHaveBeenCalledWith({
      cloudProvider: 'aws',
      functionName: 'initializeProvider',
      payload: { state },
      providerIdShort: '19255a4',
      region: 'us-east-1',
      stage: 'test',
    });
  });
});
