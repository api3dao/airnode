const spawnAwsMock = jest.fn();
jest.mock('./cloud-platforms/aws', () => ({
  spawn: spawnAwsMock,
}));

import * as fixtures from 'test/fixtures';
import * as workers from './index';
import { WorkerFunctionName, WorkerParameters } from 'src/types';

describe('spawn', () => {
  it('spawns for aws', async () => {
    spawnAwsMock.mockResolvedValueOnce({ value: 777 });
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: 'aws' });
    const parameters: WorkerParameters = {
      ...workerOpts,
      functionName: 'customFn' as WorkerFunctionName,
      payload: { from: 'ETH' },
    };
    const res = await workers.spawn(parameters);
    expect(res).toEqual({ value: 777 });
    expect(spawnAwsMock).toHaveBeenCalledTimes(1);
    expect(spawnAwsMock).toHaveBeenCalledWith(parameters);
  });
});
