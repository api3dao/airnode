const spawnAwsMock = jest.fn();
jest.mock('../workers/cloud-platforms/aws', () => ({
  spawn: spawnAwsMock,
}));

import * as worker from './worker';
import * as fixtures from '../../test/fixtures';

describe('spawnNewProvider', () => {
  fixtures.setEnvVariables({ AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey() });

  it('returns an EVM provider state for AWS', async () => {
    const workerOpts = fixtures.buildWorkerOptions({
      cloudProvider: { type: 'aws', region: 'us-east-1', disableConcurrencyReservations: false },
    });
    const state = fixtures.buildEVMProviderState();
    spawnAwsMock.mockResolvedValueOnce({ ok: true, data: state });
    const [logs, res] = await worker.spawnNewProvider(state, workerOpts);
    expect(logs).toEqual([]);
    expect(res).toEqual(state);
    expect(spawnAwsMock).toHaveBeenCalledTimes(1);
    expect(spawnAwsMock).toHaveBeenCalledWith({
      cloudProvider: {
        type: 'aws',
        region: 'us-east-1',
        disableConcurrencyReservations: false,
      },
      payload: { state, functionName: 'initializeProvider' },
      deploymentId: 'local02cce763',
    });
  });
});

describe('spawnTransactionsProcessor', () => {
  fixtures.setEnvVariables({ AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey() });

  it('returns an EVM provider state for AWS', async () => {
    const workerOpts = fixtures.buildWorkerOptions({
      cloudProvider: { type: 'aws', region: 'us-east-1', disableConcurrencyReservations: false },
    });
    const state = fixtures.buildEVMProviderState();
    spawnAwsMock.mockResolvedValueOnce({ ok: true, data: state });
    const [logs, res] = await worker.spawnProviderRequestProcessor(state, workerOpts);
    expect(logs).toEqual([]);
    expect(res).toEqual(state);
    expect(spawnAwsMock).toHaveBeenCalledTimes(1);
    expect(spawnAwsMock).toHaveBeenCalledWith({
      cloudProvider: {
        type: 'aws',
        region: 'us-east-1',
        disableConcurrencyReservations: false,
      },
      payload: { state, functionName: 'processTransactions' },
      deploymentId: 'local02cce763',
    });
  });
});
