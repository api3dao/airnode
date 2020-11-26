const spawnAwsMock = jest.fn();
jest.mock('./cloud-platforms/aws', () => ({
  spawn: spawnAwsMock,
}));

const spawnLocalMock = jest.fn();
jest.mock('./local-handlers', () => ({
  callApi: spawnLocalMock,
}));

import * as fixtures from 'test/fixtures';
import * as workers from './index';
import { WorkerFunctionName, WorkerParameters } from 'src/types';

describe('spawn', () => {
  it('spawns for aws', async () => {
    spawnAwsMock.mockResolvedValueOnce({ ok: true, data: { value: 777 } });
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: 'aws' });
    const parameters: WorkerParameters = {
      ...workerOpts,
      functionName: 'callApi' as WorkerFunctionName,
      payload: { from: 'ETH' },
    };
    const res = await workers.spawn(parameters);
    expect(res).toEqual({ ok: true, data: { value: 777 } });
    expect(spawnAwsMock).toHaveBeenCalledTimes(1);
    expect(spawnAwsMock).toHaveBeenCalledWith(parameters);
  });

  it('spawns for local', async () => {
    spawnLocalMock.mockResolvedValueOnce({ ok: true, data: { value: 777 } });
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: 'local' });
    const parameters: WorkerParameters = {
      ...workerOpts,
      functionName: 'callApi' as WorkerFunctionName,
      payload: { from: 'ETH' },
    };
    const res = await workers.spawn(parameters);
    expect(res).toEqual({ ok: true, data: { value: 777 } });
    expect(spawnLocalMock).toHaveBeenCalledTimes(1);
    expect(spawnLocalMock).toHaveBeenCalledWith({ from: 'ETH' });
  });
});
