const spawnAwsMock1 = jest.fn();
const spawnLocalAwsMock1 = jest.fn();
jest.mock('../../workers/cloud-platforms/aws', () => ({
  spawn: spawnAwsMock1,
  spawnLocal: spawnLocalAwsMock1,
}));

import * as fixtures from 'test/fixtures';
import * as worker from './worker';
import { LogOptions } from 'src/types';

describe('spawnNewApiCall', () => {
  beforeEach(() => jest.resetModules());

  const logOptions: LogOptions = {
    format: 'plain',
    meta: { coordinatorId: '837daEf231' },
  };

  it('handles local AWS calls', async () => {
    const nodeSettings = fixtures.buildNodeSettings({ cloudProvider: 'local:aws' });
    const config = fixtures.buildConfig({ nodeSettings });
    const workerOpts = {
      coordinatorId: 'abcdefg',
      config,
      providerIdShort: '19255a4',
      region: 'us-east-1',
      stage: 'test',
    };
    spawnLocalAwsMock1.mockResolvedValueOnce({ value: '0x123' });
    const aggregatedApiCall = fixtures.createAggregatedApiCall();
    const res = await worker.spawnNewApiCall(aggregatedApiCall, logOptions, workerOpts);
    expect(res).toEqual({ value: '0x123' });
    expect(spawnLocalAwsMock1).toHaveBeenCalledTimes(1);
    expect(spawnLocalAwsMock1).toHaveBeenCalledWith({
      coordinatorId: 'abcdefg',
      config,
      functionName: 'callApi',
      payload: {
        aggregatedApiCall,
        logOptions,
      },
      providerIdShort: '19255a4',
      region: 'us-east-1',
      stage: 'test',
    });
  });

  it('handles remote AWS calls', async () => {
    const nodeSettings = fixtures.buildNodeSettings({ cloudProvider: 'aws' });
    const config = fixtures.buildConfig({ nodeSettings });
    const workerOpts = {
      coordinatorId: 'abcdefg',
      config,
      providerIdShort: '19255a4',
      region: 'us-east-1',
      stage: 'test',
    };
    spawnAwsMock1.mockResolvedValueOnce({ value: '0x123' });
    const aggregatedApiCall = fixtures.createAggregatedApiCall();
    const res = await worker.spawnNewApiCall(aggregatedApiCall, logOptions, workerOpts);
    expect(res).toEqual({ value: '0x123' });
    expect(spawnAwsMock1).toHaveBeenCalledTimes(1);
    expect(spawnAwsMock1).toHaveBeenCalledWith({
      coordinatorId: 'abcdefg',
      config,
      functionName: 'callApi',
      payload: {
        aggregatedApiCall,
        logOptions,
      },
      providerIdShort: '19255a4',
      region: 'us-east-1',
      stage: 'test',
    });
  });
});
