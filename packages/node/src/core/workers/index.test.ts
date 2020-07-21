const spawnAwsMock = jest.fn();
const spawnLocalAwsMock = jest.fn();
jest.mock('./cloud-platforms/aws', () => ({
  spawn: spawnAwsMock,
  spawnLocal: spawnLocalAwsMock,
}));

describe('spawn', () => {
  beforeEach(() => jest.resetModules());

  it('spawns for aws', async () => {
    const config = { nodeSettings: { cloudProvider: 'aws' } };
    jest.mock('../config', () => ({ config }));

    spawnAwsMock.mockResolvedValueOnce({ value: 777 });

    const { spawn } = require('./index');
    const res = await spawn({ from: 'ETH' });
    expect(res).toEqual({ value: 777 });

    expect(spawnAwsMock).toHaveBeenCalledTimes(1);
    expect(spawnAwsMock).toHaveBeenCalledWith({ from: 'ETH' });
  });

  it('spawns for local:aws', async () => {
    const config = { nodeSettings: { cloudProvider: 'local:aws' } };
    jest.mock('../config', () => ({ config }));

    spawnLocalAwsMock.mockResolvedValueOnce({ value: 1000 });

    const { spawn } = require('./index');
    const res = await spawn({ from: 'ETH' });
    expect(res).toEqual({ value: 1000 });

    expect(spawnLocalAwsMock).toHaveBeenCalledTimes(1);
    expect(spawnLocalAwsMock).toHaveBeenCalledWith({ from: 'ETH' });
  });
});
