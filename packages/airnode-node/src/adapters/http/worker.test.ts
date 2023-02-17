import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { logger, LogOptions, setLogOptions } from '@api3/airnode-utilities';
import * as worker from './worker';
import * as fixtures from '../../../test/fixtures';
import { encodeUtf8 } from '../../workers/cloud-platforms/aws';

const mockLambdaClient = mockClient(LambdaClient);

describe('spawnNewApiCall', () => {
  const logOptions: LogOptions = {
    format: 'plain',
    level: 'DEBUG',
    meta: { 'Coordinator-ID': '837daEf231' },
  };
  setLogOptions(logOptions);

  const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall();
  const mockInvokeCommandInput = {
    FunctionName: 'airnode-local02cce763-run',
    Payload: encodeUtf8(JSON.stringify({ aggregatedApiCall, logOptions, functionName: 'callApi' })),
  };

  beforeEach(() => {
    mockLambdaClient.reset();
  });

  it('handles remote AWS calls', async () => {
    mockLambdaClient.on(InvokeCommand, mockInvokeCommandInput).resolves({
      Payload: encodeUtf8(JSON.stringify({ body: JSON.stringify({ ok: true, data: { value: '0x123' } }) })),
    });

    const workerOpts = fixtures.buildWorkerOptions({
      cloudProvider: { type: 'aws', region: 'us-east-1', disableConcurrencyReservations: false },
    });
    const [logs, res] = await worker.spawnNewApiCall(aggregatedApiCall, workerOpts);
    expect(logs).toEqual([]);
    expect(res).toEqual({ value: '0x123' });
    expect(mockLambdaClient).toHaveReceivedCommandWith(InvokeCommand, mockInvokeCommandInput);
  });

  it('returns an error if the worker rejects', async () => {
    mockLambdaClient.on(InvokeCommand, mockInvokeCommandInput).rejects(new Error('Something went wrong'));

    const workerOpts = fixtures.buildWorkerOptions({
      cloudProvider: { type: 'aws', region: 'us-east-1', disableConcurrencyReservations: false },
    });
    const [logs, res] = await worker.spawnNewApiCall(aggregatedApiCall, workerOpts);
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Unable to call API endpoint:convertToUSD', error: new Error('Something went wrong') },
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
    const [logs, res] = await worker.spawnNewApiCall(aggregatedApiCall, workerOpts);
    expect(logs).toEqual([errorLog]);
    expect(res).toEqual(null);
    expect(mockLambdaClient).toHaveReceivedCommandWith(InvokeCommand, mockInvokeCommandInput);
  });

  it('returns an error if the response is not ok', async () => {
    mockLambdaClient
      .on(InvokeCommand, mockInvokeCommandInput)
      .resolves({ Payload: encodeUtf8(JSON.stringify({ body: JSON.stringify({ ok: false }) })) });

    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall();
    const workerOpts = fixtures.buildWorkerOptions({
      cloudProvider: { type: 'aws', region: 'us-east-1', disableConcurrencyReservations: false },
    });
    const [logs, res] = await worker.spawnNewApiCall(aggregatedApiCall, workerOpts);
    expect(logs).toEqual([{ level: 'ERROR', message: 'Unable to call API endpoint:convertToUSD' }]);
    expect(res).toEqual(null);
    expect(mockLambdaClient).toHaveReceivedCommandWith(InvokeCommand, mockInvokeCommandInput);
  });
});
