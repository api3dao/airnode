const spawnAwsMock = jest.fn();
jest.mock('../workers/cloud-platforms/aws', () => ({
  spawn: spawnAwsMock,
}));

import * as worker from './worker';
import * as fixtures from '../../test/fixtures';

describe('spawnNewProvider', () => {
  it('returns an EVM provider state for AWS', async () => {
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: 'aws' });
    const state = fixtures.buildEVMProviderState();
    spawnAwsMock.mockResolvedValueOnce({ ok: true, data: state });
    const [logs, res] = await worker.spawnNewProvider(state, workerOpts);
    expect(logs).toEqual([]);
    expect(res).toEqual(state);
    expect(spawnAwsMock).toHaveBeenCalledTimes(1);
    expect(spawnAwsMock).toHaveBeenCalledWith({
      cloudProvider: 'aws',
      functionName: 'initializeProvider',
      payload: { state },
      airnodeAddressShort: '19255a4',
      region: 'us-east-1',
      stage: 'test',
    });
  });
});

describe('spawnProviderRequestProcessor', () => {
  it('returns an EVM provider state for AWS', async () => {
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: 'aws' });
    const state = fixtures.buildEVMProviderState();
    spawnAwsMock.mockResolvedValueOnce({ ok: true, data: state });
    const [logs, res] = await worker.spawnProviderRequestProcessor(state, workerOpts);
    expect(logs).toEqual([]);
    expect(res).toEqual(state);
    expect(spawnAwsMock).toHaveBeenCalledTimes(1);
    expect(spawnAwsMock).toHaveBeenCalledWith({
      cloudProvider: 'aws',
      functionName: 'processProviderRequests',
      payload: { state },
      airnodeAddressShort: '19255a4',
      region: 'us-east-1',
      stage: 'test',
    });
  });
});
