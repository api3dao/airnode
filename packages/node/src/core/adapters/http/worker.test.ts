const invokeMock = jest.fn();
jest.mock('aws-sdk', () => ({
  Lambda: jest.fn().mockImplementation(() => ({
    invoke: invokeMock,
  })),
}));

import * as fixtures from 'test/fixtures';
import * as logger from '../../logger';
import * as worker from './worker';
import { LogOptions } from 'src/types';

describe('spawnNewApiCall', () => {
  const logOptions: LogOptions = {
    format: 'plain',
    meta: { coordinatorId: '837daEf231' },
  };

  it('handles remote AWS calls', async () => {
    invokeMock.mockImplementationOnce((params, callback) => callback(null, { ok: true, data: { value: '0x123' } }));
    const aggregatedApiCall = fixtures.createAggregatedApiCall();
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: 'aws' });
    const [logs, res] = await worker.spawnNewApiCall(aggregatedApiCall, logOptions, workerOpts);
    expect(logs).toEqual([]);
    expect(res).toEqual({ value: '0x123' });
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith(
      {
        FunctionName: 'airnode-19255a4-test-callApi',
        Payload: JSON.stringify({ aggregatedApiCall, logOptions }),
      },
      expect.anything()
    );
  });

  it('returns an error if the worker rejects', async () => {
    invokeMock.mockImplementationOnce((params, callback) => callback(new Error('Something went wrong'), null));
    const aggregatedApiCall = fixtures.createAggregatedApiCall();
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: 'aws' });
    const [logs, res] = await worker.spawnNewApiCall(aggregatedApiCall, logOptions, workerOpts);
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Unable to call API endpoint:convertToUsd', error: new Error('Something went wrong') },
    ]);
    expect(res).toEqual(null);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith(
      {
        FunctionName: 'airnode-19255a4-test-callApi',
        Payload: JSON.stringify({ aggregatedApiCall, logOptions }),
      },
      expect.anything()
    );
  });

  it('returns an error if the response has an error log', async () => {
    const errorLog = logger.pend('ERROR', 'Something went wrong');
    invokeMock.mockImplementationOnce((params, callback) => callback(null, { ok: false, errorLog }));
    const aggregatedApiCall = fixtures.createAggregatedApiCall();
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: 'aws' });
    const [logs, res] = await worker.spawnNewApiCall(aggregatedApiCall, logOptions, workerOpts);
    expect(logs).toEqual([errorLog]);
    expect(res).toEqual(null);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith(
      {
        FunctionName: 'airnode-19255a4-test-callApi',
        Payload: JSON.stringify({ aggregatedApiCall, logOptions }),
      },
      expect.anything()
    );
  });

  it('returns an error if the response is not ok', async () => {
    invokeMock.mockImplementationOnce((params, callback) => callback(null, { ok: false }));
    const aggregatedApiCall = fixtures.createAggregatedApiCall();
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: 'aws' });
    const [logs, res] = await worker.spawnNewApiCall(aggregatedApiCall, logOptions, workerOpts);
    expect(logs).toEqual([{ level: 'ERROR', message: 'Unable to call API endpoint:convertToUsd' }]);
    expect(res).toEqual(null);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith(
      {
        FunctionName: 'airnode-19255a4-test-callApi',
        Payload: JSON.stringify({ aggregatedApiCall, logOptions }),
      },
      expect.anything()
    );
  });
});
