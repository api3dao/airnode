const spawnAwsMock = jest.fn();
jest.mock('./cloud-platforms/aws', () => ({
  spawn: spawnAwsMock,
}));

const spawnLocalMock = jest.fn();
jest.mock('./local-handlers', () => ({
  initializeProvider: spawnLocalMock,
}));

import * as fixtures from '../../test/fixtures';
import { CloudProvider } from '../config';
import { WorkerParameters } from '../types';
import * as workers from './index';

describe('spawn', () => {
  fixtures.setEnvVariables({ AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey() });

  it('spawns for aws', async () => {
    spawnAwsMock.mockResolvedValueOnce({ ok: true, data: { value: 777 } });
    const state = fixtures.buildEVMProviderState();
    const workerOpts = fixtures.buildWorkerOptions({
      cloudProvider: { type: 'aws', region: 'us-east-1', disableConcurrencyReservations: false },
    });
    const logOptions = fixtures.buildLogOptions();
    const parameters: WorkerParameters = {
      ...workerOpts,
      payload: { functionName: 'initializeProvider', state, logOptions },
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
    const logOptions = fixtures.buildLogOptions();
    const parameters: WorkerParameters = {
      ...workerOpts,
      payload: { functionName: 'initializeProvider', state, logOptions },
    };
    const res = await workers.spawn(parameters);
    expect(res).toEqual({ ok: true, data: { value: 777 } });
    expect(spawnLocalMock).toHaveBeenCalledTimes(1);
    expect(spawnLocalMock).toHaveBeenCalledWith(parameters.payload);
  });
});

describe('deriveDeploymentId', () => {
  it('creates a unique hash from deployment details', () => {
    const cloudProvider = {
      type: 'aws',
      region: 'us-east-1',
    } as CloudProvider;
    const airnodeAddress = '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace';
    const stage = 'dev';
    const airnodeVersion = '0.9.5';

    expect(workers.deriveDeploymentId(cloudProvider, airnodeAddress, stage, airnodeVersion)).toEqual('aws521d7174');
  });
});

describe('deriveDeploymentVersionId', () => {
  it('creates a unique hash from deployment version details', () => {
    const cloudProvider = {
      type: 'aws',
      region: 'us-east-1',
    } as CloudProvider;
    const airnodeAddress = '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace';
    const stage = 'dev';
    const airnodeVersion = '0.9.5';
    const timestamp = '1664256335137';

    expect(workers.deriveDeploymentVersionId(cloudProvider, airnodeAddress, stage, airnodeVersion, timestamp)).toEqual(
      'e2d3286d'
    );
  });
});
