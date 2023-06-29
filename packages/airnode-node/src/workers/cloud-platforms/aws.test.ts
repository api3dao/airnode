import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import * as aws from './aws';
import * as fixtures from '../../../test/fixtures';
import { WorkerParameters } from '../../types';

const mockLambdaClient = mockClient(LambdaClient);

const encodingTestString = 'test string';
const encodingTestByteArray = new Uint8Array([116, 101, 115, 116, 32, 115, 116, 114, 105, 110, 103]);

describe('encodeUtf8', () => {
  it('converts input string into a byte stream with UTF-8 encoding', () => {
    expect(aws.encodeUtf8(encodingTestString)).toEqual(encodingTestByteArray);
  });
});

describe('decodeUtf8', () => {
  it('converts a byte stream with UTF-8 encoding into a string', () => {
    expect(aws.decodeUtf8(encodingTestByteArray)).toEqual(encodingTestString);
  });
});

describe('spawn', () => {
  fixtures.setEnvVariables({ AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey() });

  const state = fixtures.buildEVMProviderState();
  const workerOpts = fixtures.buildWorkerOptions({
    cloudProvider: { type: 'aws', region: 'us-east-1', disableConcurrencyReservations: false },
  });
  const logOptions = fixtures.buildLogOptions();
  const parameters: WorkerParameters = {
    ...workerOpts,
    payload: { functionName: 'initializeProvider', state, logOptions },
  };
  const mockInvokeCommandInput = {
    FunctionName: 'airnode-local02cce763-run',
    Payload: aws.encodeUtf8(JSON.stringify({ functionName: 'initializeProvider', state, logOptions })),
  };

  beforeEach(() => {
    mockLambdaClient.reset();
  });

  it('derives the function name, invokes and returns the response', async () => {
    mockLambdaClient
      .on(InvokeCommand, mockInvokeCommandInput)
      .resolves({ Payload: aws.encodeUtf8(JSON.stringify({ body: JSON.stringify({ value: 7777 }) })) });

    const res = await aws.spawn(parameters);
    expect(res).toEqual({ value: 7777 });
    expect(mockLambdaClient).toHaveReceivedCommandWith(InvokeCommand, mockInvokeCommandInput);
  });

  it('throws an error if the lambda returns an error', async () => {
    mockLambdaClient.on(InvokeCommand, mockInvokeCommandInput).rejects(new Error('Something went wrong'));

    await expect(aws.spawn(parameters)).rejects.toThrow(new Error('Something went wrong'));
    expect(mockLambdaClient).toHaveReceivedCommandWith(InvokeCommand, mockInvokeCommandInput);
  });
});
