const spawnAwsMock = jest.fn();
jest.mock('./cloud-platforms/aws', () => ({
  spawn: spawnAwsMock,
}));

const spawnLocalMock = jest.fn();
jest.mock('./local-handlers', () => ({
  initializeProvider: spawnLocalMock,
}));

import * as fixtures from '../../test/fixtures';
import { WorkerParameters } from '../types';
import * as workers from './index';

describe('spawn', () => {
  const OLD_ENV = process.env;

  beforeAll(() => {
    jest.resetModules();
    process.env = {
      ...OLD_ENV,
      AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey(),
    };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('spawns for aws', async () => {
    spawnAwsMock.mockResolvedValueOnce({ ok: true, data: { value: 777 } });
    const state = fixtures.buildEVMProviderState();
    const workerOpts = fixtures.buildWorkerOptions({
      cloudProvider: { type: 'aws', region: 'us-east-1', disableConcurrencyReservations: false },
    });
    const parameters: WorkerParameters = {
      ...workerOpts,
      payload: { functionName: 'initializeProvider', state },
    };
    const res = await workers.spawn(parameters);
    expect(res).toEqual({ ok: true, data: { value: 777 } });
    expect(spawnAwsMock).toHaveBeenCalledTimes(1);
    expect(spawnAwsMock).toHaveBeenCalledWith(parameters);
  });

  it('spawns for local', async () => {
    spawnLocalMock.mockResolvedValueOnce({ ok: true, data: { value: 777 } });
    const state = fixtures.buildEVMProviderState();
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: { type: 'local' } });
    const parameters: WorkerParameters = {
      ...workerOpts,
      payload: { functionName: 'initializeProvider', state },
    };
    const res = await workers.spawn(parameters);
    expect(res).toEqual({ ok: true, data: { value: 777 } });
    expect(spawnLocalMock).toHaveBeenCalledTimes(1);
    expect(spawnLocalMock).toHaveBeenCalledWith(parameters.payload);
  });
});
