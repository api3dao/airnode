const spawnAwsMock = jest.fn();
jest.mock('./cloud-platforms/aws', () => ({
  spawn: spawnAwsMock,
}));

const spawnLocalMock = jest.fn();
jest.mock('./local-handlers', () => ({
  callApi: spawnLocalMock,
}));

import * as fixtures from '../../test/fixtures';
import { WorkerFunctionName, WorkerParameters } from '../types';
import * as workers from './index';

describe('spawn', () => {
  it('spawns for aws', async () => {
    spawnAwsMock.mockResolvedValueOnce({ ok: true, data: { value: 777 } });
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: { name: 'aws', region: 'us-east-1' } });
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
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: { name: 'local' } });
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
