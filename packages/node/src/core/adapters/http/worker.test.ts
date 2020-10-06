const spawnAwsMock1 = jest.fn();
const spawnLocalAwsMock1 = jest.fn();
jest.mock('../../workers/cloud-platforms/aws', () => ({
  spawn: spawnAwsMock1,
  spawnLocal: spawnLocalAwsMock1,
}));

import * as fixtures from 'test/fixtures';
import { LogOptions } from 'src/types';

describe('spawnNewApiCall', () => {
  beforeEach(() => jest.resetModules());

  const logOptions: LogOptions = {
    format: 'plain',
    meta: { coordinatorId: '837daEf231' },
  };

  it('handles local AWS calls', async () => {
    const config = { nodeSettings: { cloudProvider: 'local:aws' } };
    jest.mock('../../config', () => ({ config }));
    spawnLocalAwsMock1.mockResolvedValueOnce({ value: '0x123' });
    const { spawnNewApiCall } = require('./worker');
    const aggregatedApiCall = fixtures.createAggregatedApiCall();
    const res = await spawnNewApiCall(aggregatedApiCall, logOptions);
    expect(res).toEqual({ value: '0x123' });
    expect(spawnLocalAwsMock1).toHaveBeenCalledTimes(1);
    expect(spawnLocalAwsMock1).toHaveBeenCalledWith({
      functionName: 'callApi',
      payload: {
        parameters: {
          aggregatedApiCall,
          logOptions,
        },
      },
    });
  });

  it('handles remote AWS calls', async () => {
    const config = { nodeSettings: { cloudProvider: 'aws' } };
    jest.mock('../../config', () => ({ config }));
    spawnAwsMock1.mockResolvedValueOnce({ value: '0x123' });
    const { spawnNewApiCall } = require('./worker');
    const aggregatedApiCall = fixtures.createAggregatedApiCall();
    const res = await spawnNewApiCall(aggregatedApiCall, logOptions);
    expect(res).toEqual({ value: '0x123' });
    expect(spawnAwsMock1).toHaveBeenCalledTimes(1);
    expect(spawnAwsMock1).toHaveBeenCalledWith({
      functionName: 'callApi',
      payload: {
        aggregatedApiCall,
        logOptions,
      },
    });
  });
});
