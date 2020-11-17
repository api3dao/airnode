const invokeMock = jest.fn();
jest.mock('aws-sdk', () => ({
  Lambda: jest.fn().mockImplementation(() => ({
    invoke: invokeMock,
  })),
}));

import * as fixtures from 'test/fixtures';
import * as logger from '../logger';
import * as worker from './workers';

describe('spawnNewProvider', () => {
  it('handles remote AWS calls', async () => {
    const state = fixtures.buildEVMProviderState();
    invokeMock.mockImplementationOnce((params, callback) => callback(null, { ok: true, data: state }));
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: 'aws' });
    const [logs, res] = await worker.spawnNewProvider(state, workerOpts);
    expect(logs).toEqual([]);
    expect(res).toEqual(state);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith(
      {
        FunctionName: 'airnode-test-19255a4-initializeProvider',
        Payload: JSON.stringify({ state }),
      },
      expect.anything()
    );
  });

  it('returns an error if the worker rejects', async () => {
    const state = fixtures.buildEVMProviderState();
    invokeMock.mockImplementationOnce((params, callback) => callback(new Error('Something went wrong'), null));
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: 'aws' });
    const [logs, res] = await worker.spawnNewProvider(state, workerOpts);
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: 'Unable to initialize provider:ganache-test',
        error: new Error('Something went wrong'),
      },
    ]);
    expect(res).toEqual(null);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith(
      {
        FunctionName: 'airnode-test-19255a4-initializeProvider',
        Payload: JSON.stringify({ state }),
      },
      expect.anything()
    );
  });

  it('returns an error if the response has an error log', async () => {
    const state = fixtures.buildEVMProviderState();
    const errorLog = logger.pend('ERROR', 'Something went wrong');
    invokeMock.mockImplementationOnce((params, callback) => callback(null, { ok: false, errorLog }));
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: 'aws' });
    const [logs, res] = await worker.spawnNewProvider(state, workerOpts);
    expect(logs).toEqual([errorLog]);
    expect(res).toEqual(null);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith(
      {
        FunctionName: 'airnode-test-19255a4-initializeProvider',
        Payload: JSON.stringify({ state }),
      },
      expect.anything()
    );
  });

  it('returns an error if the response is not ok', async () => {
    const state = fixtures.buildEVMProviderState();
    invokeMock.mockImplementationOnce((params, callback) => callback(null, { ok: false }));
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: 'aws' });
    const [logs, res] = await worker.spawnNewProvider(state, workerOpts);
    expect(logs).toEqual([{ level: 'ERROR', message: 'Unable to initialize provider:ganache-test' }]);
    expect(res).toEqual(null);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith(
      {
        FunctionName: 'airnode-test-19255a4-initializeProvider',
        Payload: JSON.stringify({ state }),
      },
      expect.anything()
    );
  });
});

describe('spawnProviderRequestProcessor', () => {
  it('handles remote AWS calls', async () => {
    const state = fixtures.buildEVMProviderState();
    invokeMock.mockImplementationOnce((params, callback) => callback(null, { ok: true, data: state }));
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: 'aws' });
    const [logs, res] = await worker.spawnProviderRequestProcessor(state, workerOpts);
    expect(logs).toEqual([]);
    expect(res).toEqual(state);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith(
      {
        FunctionName: 'airnode-test-19255a4-processProviderRequests',
        Payload: JSON.stringify({ state }),
      },
      expect.anything()
    );
  });

  it('returns an error if the worker rejects', async () => {
    const state = fixtures.buildEVMProviderState();
    invokeMock.mockImplementationOnce((params, callback) => callback(new Error('Something went wrong'), null));
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: 'aws' });
    const [logs, res] = await worker.spawnProviderRequestProcessor(state, workerOpts);
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: 'Unable to process provider requests:ganache-test',
        error: new Error('Something went wrong'),
      },
    ]);
    expect(res).toEqual(null);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith(
      {
        FunctionName: 'airnode-test-19255a4-processProviderRequests',
        Payload: JSON.stringify({ state }),
      },
      expect.anything()
    );
  });

  it('returns an error if the response has an error log', async () => {
    const state = fixtures.buildEVMProviderState();
    const errorLog = logger.pend('ERROR', 'Something went wrong');
    invokeMock.mockImplementationOnce((params, callback) => callback(null, { ok: false, errorLog }));
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: 'aws' });
    const [logs, res] = await worker.spawnProviderRequestProcessor(state, workerOpts);
    expect(logs).toEqual([errorLog]);
    expect(res).toEqual(null);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith(
      {
        FunctionName: 'airnode-test-19255a4-processProviderRequests',
        Payload: JSON.stringify({ state }),
      },
      expect.anything()
    );
  });

  it('returns an error if the response is not ok', async () => {
    const state = fixtures.buildEVMProviderState();
    invokeMock.mockImplementationOnce((params, callback) => callback(null, { ok: false }));
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: 'aws' });
    const [logs, res] = await worker.spawnProviderRequestProcessor(state, workerOpts);
    expect(logs).toEqual([{ level: 'ERROR', message: 'Unable to process provider requests:ganache-test' }]);
    expect(res).toEqual(null);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith(
      {
        FunctionName: 'airnode-test-19255a4-processProviderRequests',
        Payload: JSON.stringify({ state }),
      },
      expect.anything()
    );
  });
});
