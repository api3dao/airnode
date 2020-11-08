const spawnAwsMock = jest.fn();
const spawnLocalAwsMock = jest.fn();
jest.mock('./cloud-platforms/aws', () => ({
  spawn: spawnAwsMock,
  spawnLocal: spawnLocalAwsMock,
}));

import * as fixtures from 'test/fixtures';
import * as workers from './index';

describe('spawn', () => {
  it('spawns for aws', async () => {
    spawnAwsMock.mockResolvedValueOnce({ value: 777 });
    const settings = fixtures.buildNodeSettings({ cloudProvider: 'aws' });
    const config = fixtures.buildConfig({ nodeSettings: settings });
    const parameters: workers.WorkerParameters = {
      config,
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
    const settings = fixtures.buildNodeSettings({ cloudProvider: 'local:aws' });
    const config = fixtures.buildConfig({ nodeSettings: settings });
    const parameters: workers.WorkerParameters = {
      config,
      functionName: 'customFn',
      payload: { from: 'BTC' },
    };
    const res = await workers.spawn(parameters);
    expect(res).toEqual({ value: 1000 });
    expect(spawnLocalAwsMock).toHaveBeenCalledTimes(1);
    expect(spawnLocalAwsMock).toHaveBeenCalledWith(parameters);
  });
});
