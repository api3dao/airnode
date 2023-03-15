import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { logger } from '@api3/airnode-utilities';
import * as worker from './workers';
import * as fixtures from '../../test/fixtures';
import { encodeUtf8 } from '../workers/cloud-platforms/aws';

const mockLambdaClient = mockClient(LambdaClient);

const workers = ['spawnNewProvider', 'spawnProviderRequestProcessor'] as ReadonlyArray<keyof typeof worker>;

const serverlessFunctionName = 'airnode-local02cce763-run';
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
    fixtures.setEnvVariables({ AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey() });
    const state = fixtures.buildEVMProviderSponsorState();
    const mockInvokeCommandInput = {
      FunctionName: serverlessFunctionName,
      Payload: encodeUtf8(JSON.stringify({ state, functionName: functionNames[workerType] })),
    };

    beforeEach(() => {
      mockLambdaClient.reset();
    });

    it('handles remote AWS calls', async () => {
      mockLambdaClient.on(InvokeCommand, mockInvokeCommandInput).resolves({
        Payload: encodeUtf8(JSON.stringify({ body: JSON.stringify({ ok: true, data: state }) })),
      });

      const workerOpts = fixtures.buildWorkerOptions({
        cloudProvider: { type: 'aws', region: 'us-east-1', disableConcurrencyReservations: false },
      });
      const [logs, res] = await worker[workerType](state, workerOpts);
      expect(logs).toEqual([]);
      expect(res).toEqual(state);
      expect(mockLambdaClient).toHaveReceivedCommandWith(InvokeCommand, mockInvokeCommandInput);
    });

    it('returns an error if the worker rejects', async () => {
      mockLambdaClient.on(InvokeCommand, mockInvokeCommandInput).rejects(new Error('Something went wrong'));

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
      expect(mockLambdaClient).toHaveReceivedCommandWith(InvokeCommand, mockInvokeCommandInput);
    });

    it('returns an error if the response has an error log', async () => {
      const errorLog = logger.pend('ERROR', 'Something went wrong');
      mockLambdaClient.on(InvokeCommand, mockInvokeCommandInput).resolves({
        Payload: encodeUtf8(JSON.stringify({ body: JSON.stringify({ ok: false, errorLog }) })),
      });

      const workerOpts = fixtures.buildWorkerOptions({
        cloudProvider: { type: 'aws', region: 'us-east-1', disableConcurrencyReservations: false },
      });
      const [logs, res] = await worker[workerType](state, workerOpts);
      expect(logs).toEqual([errorLog]);
      expect(res).toEqual(null);
      expect(mockLambdaClient).toHaveReceivedCommandWith(InvokeCommand, mockInvokeCommandInput);
    });

    it('returns an error if the response is not ok', async () => {
      mockLambdaClient
        .on(InvokeCommand, mockInvokeCommandInput)
        .resolves({ Payload: encodeUtf8(JSON.stringify({ body: JSON.stringify({ ok: false }) })) });

      const workerOpts = fixtures.buildWorkerOptions({
        cloudProvider: { type: 'aws', region: 'us-east-1', disableConcurrencyReservations: false },
      });
      const [logs, res] = await worker[workerType](state, workerOpts);
      expect(logs).toEqual([{ level: 'ERROR', message: providerErrorForWorker[workerType] }]);
      expect(res).toEqual(null);
      expect(mockLambdaClient).toHaveReceivedCommandWith(InvokeCommand, mockInvokeCommandInput);
    });
  });
});
