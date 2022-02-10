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

const serverlessFunctionName = 'airnode-19255a4-test-run';
const functionNames = {
  spawnNewProvider: 'initializeProvider',
  spawnProviderRequestProcessor: 'processTransactions',
} as const;
const providerErrorForWorker = {
  spawnNewProvider: 'Unable to initialize provider: Ganache test',
  spawnProviderRequestProcessor: 'Unable to process provider requests: Ganache test',
} as const;

workers.forEach((workerType) => {
  describe(`${workerType} worker`, () => {
    it('handles remote AWS calls', async () => {
      const state = fixtures.buildEVMProviderSponsorState();
      invokeMock.mockImplementationOnce((params, callback) =>
        callback(null, { Payload: JSON.stringify({ body: JSON.stringify({ ok: true, data: state }) }) })
      );
      const workerOpts = fixtures.buildWorkerOptions({
        cloudProvider: { type: 'aws', region: 'us-east-1', disableConcurrencyReservations: false },
      });
      const [logs, res] = await worker[workerType](state, workerOpts);
      expect(logs).toEqual([]);
      expect(res).toEqual(state);
      expect(invokeMock).toHaveBeenCalledTimes(1);
      expect(invokeMock).toHaveBeenCalledWith(
        {
          FunctionName: serverlessFunctionName,
          Payload: JSON.stringify({ state, functionName: functionNames[workerType] }),
        },
        expect.anything()
      );
    });

    it('returns an error if the worker rejects', async () => {
      const state = fixtures.buildEVMProviderSponsorState();
      invokeMock.mockImplementationOnce((params, callback) => callback(new Error('Something went wrong'), null));
      const workerOpts = fixtures.buildWorkerOptions({
        cloudProvider: { type: 'aws', region: 'us-east-1', disableConcurrencyReservations: false },
      });
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
          FunctionName: serverlessFunctionName,
          Payload: JSON.stringify({ state, functionName: functionNames[workerType] }),
        },
        expect.anything()
      );
    });

    it('returns an error if the response has an error log', async () => {
      const state = fixtures.buildEVMProviderSponsorState();
      const errorLog = logger.pend('ERROR', 'Something went wrong');
      invokeMock.mockImplementationOnce((params, callback) =>
        callback(null, { Payload: JSON.stringify({ body: JSON.stringify({ ok: false, errorLog }) }) })
      );
      const workerOpts = fixtures.buildWorkerOptions({
        cloudProvider: { type: 'aws', region: 'us-east-1', disableConcurrencyReservations: false },
      });
      const [logs, res] = await worker[workerType](state, workerOpts);
      expect(logs).toEqual([errorLog]);
      expect(res).toEqual(null);
      expect(invokeMock).toHaveBeenCalledTimes(1);
      expect(invokeMock).toHaveBeenCalledWith(
        {
          FunctionName: serverlessFunctionName,
          Payload: JSON.stringify({ state, functionName: functionNames[workerType] }),
        },
        expect.anything()
      );
    });

    it('returns an error if the response is not ok', async () => {
      const state = fixtures.buildEVMProviderSponsorState();
      invokeMock.mockImplementationOnce((params, callback) =>
        callback(null, { Payload: JSON.stringify({ body: JSON.stringify({ ok: false }) }) })
      );
      const workerOpts = fixtures.buildWorkerOptions({
        cloudProvider: { type: 'aws', region: 'us-east-1', disableConcurrencyReservations: false },
      });
      const [logs, res] = await worker[workerType](state, workerOpts);
      expect(logs).toEqual([{ level: 'ERROR', message: providerErrorForWorker[workerType] }]);
      expect(res).toEqual(null);
      expect(invokeMock).toHaveBeenCalledTimes(1);
      expect(invokeMock).toHaveBeenCalledWith(
        {
          FunctionName: serverlessFunctionName,
          Payload: JSON.stringify({ state, functionName: functionNames[workerType] }),
        },
        expect.anything()
      );
    });
  });
});
