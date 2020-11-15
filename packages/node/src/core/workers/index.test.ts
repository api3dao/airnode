const spawnAwsMock = jest.fn();
const spawnLocalAwsMock = jest.fn();
jest.mock('./cloud-platforms/aws', () => ({
  spawn: spawnAwsMock,
  spawnLocal: spawnLocalAwsMock,
}));

import * as fixtures from 'test/fixtures';
import * as workers from './index';
import { WorkerParameters } from 'src/types';

describe('spawn', () => {
  it('spawns for aws', async () => {
    spawnAwsMock.mockResolvedValueOnce({ value: 777 });
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: 'aws' });
    const parameters: WorkerParameters = {
      ...workerOpts,
      functionName: 'customFn',
      payload: { from: 'ETH' },
    };
    const res = await workers.spawn(parameters);
    expect(res).toEqual({ value: 777 });
    expect(spawnAwsMock).toHaveBeenCalledTimes(1);
    expect(spawnAwsMock).toHaveBeenCalledWith(parameters);
  });

  it('spawns for local:aws', async () => {
    spawnLocalAwsMock.mockResolvedValueOnce({ value: 1000 });
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: 'local:aws' });
    const parameters: WorkerParameters = {
      ...workerOpts,
      functionName: 'customFn',
      payload: { from: 'BTC' },
    };
    const res = await workers.spawn(parameters);
    expect(res).toEqual({ value: 1000 });
    expect(spawnLocalAwsMock).toHaveBeenCalledTimes(1);
    expect(spawnLocalAwsMock).toHaveBeenCalledWith(parameters);
  });
});

describe('isLocalEnv', () => {
  it('returns true for local providers', () => {
    expect(workers.isLocalEnv('local:aws')).toEqual(true);
  });

  it('returns false for remote cloud providers', () => {
    expect(workers.isLocalEnv('aws')).toEqual(false);
  });
});
