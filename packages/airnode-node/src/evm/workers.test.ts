const invokeMock = jest.fn();
jest.mock('aws-sdk', () => ({
  Lambda: jest.fn().mockImplementation(() => ({
    invoke: invokeMock,
  })),
}));

import * as worker from './workers';
import * as logger from '../logger';
import * as fixtures from '../../test/fixtures';

const workers = ['spawnNewProvider', 'spawnProviderRequestProcessor'] as ReadonlyArray<keyof typeof worker>;

const functionNameForWorker = {
  spawnNewProvider: 'airnode-19255a4-test-initializeProvider',
  spawnProviderRequestProcessor: 'airnode-19255a4-test-processProviderRequests',
} as const;

const providerErrorForWorker = {
  spawnNewProvider: 'Unable to initialize provider: Ganache test',
  spawnProviderRequestProcessor: 'Unable to process provider requests: Ganache test',
} as const;

workers.forEach((workerType) => {
  describe(`${workerType} worker`, () => {
    it('handles remote AWS calls', async () => {
      const state = fixtures.buildEVMProviderState();
      invokeMock.mockImplementationOnce((params, callback) =>
        callback(null, { Payload: JSON.stringify({ body: JSON.stringify({ ok: true, data: state }) }) })
      );
      const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: { name: 'aws', region: 'us-east-1' } });
      const [logs, res] = await worker[workerType](state, workerOpts);
      expect(logs).toEqual([]);
      expect(res).toEqual(state);
      expect(invokeMock).toHaveBeenCalledTimes(1);
      expect(invokeMock).toHaveBeenCalledWith(
        {
          FunctionName: functionNameForWorker[workerType],
          Payload: JSON.stringify({ state }),
        },
        expect.anything()
      );
    });

    it('returns an error if the worker rejects', async () => {
      const state = fixtures.buildEVMProviderState();
      invokeMock.mockImplementationOnce((params, callback) => callback(new Error('Something went wrong'), null));
      const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: { name: 'aws', region: 'us-east-1' } });
      const [logs, res] = await worker[workerType](state, workerOpts);
      expect(logs).toEqual([
        {
          level: 'ERROR',
          message: providerErrorForWorker[workerType],
          error: new Error('Something went wrong'),
        },
      ]);
      expect(res).toEqual(null);
      expect(invokeMock).toHaveBeenCalledTimes(1);
      expect(invokeMock).toHaveBeenCalledWith(
        {
          FunctionName: functionNameForWorker[workerType],
          Payload: JSON.stringify({ state }),
        },
        expect.anything()
      );
    });

    it('returns an error if the response has an error log', async () => {
      const state = fixtures.buildEVMProviderState();
      const errorLog = logger.pend('ERROR', 'Something went wrong');
      invokeMock.mockImplementationOnce((params, callback) =>
        callback(null, { Payload: JSON.stringify({ body: JSON.stringify({ ok: false, errorLog }) }) })
      );
      const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: { name: 'aws', region: 'us-east-1' } });
      const [logs, res] = await worker[workerType](state, workerOpts);
      expect(logs).toEqual([errorLog]);
      expect(res).toEqual(null);
      expect(invokeMock).toHaveBeenCalledTimes(1);
      expect(invokeMock).toHaveBeenCalledWith(
        {
          FunctionName: functionNameForWorker[workerType],
          Payload: JSON.stringify({ state }),
        },
        expect.anything()
      );
    });

    it('returns an error if the response is not ok', async () => {
      const state = fixtures.buildEVMProviderState();
      invokeMock.mockImplementationOnce((params, callback) =>
        callback(null, { Payload: JSON.stringify({ body: JSON.stringify({ ok: false }) }) })
      );
      const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: { name: 'aws', region: 'us-east-1' } });
      const [logs, res] = await worker[workerType](state, workerOpts);
      expect(logs).toEqual([{ level: 'ERROR', message: providerErrorForWorker[workerType] }]);
      expect(res).toEqual(null);
      expect(invokeMock).toHaveBeenCalledTimes(1);
      expect(invokeMock).toHaveBeenCalledWith(
        {
          FunctionName: functionNameForWorker[workerType],
          Payload: JSON.stringify({ state }),
        },
        expect.anything()
      );
    });
  });
});
