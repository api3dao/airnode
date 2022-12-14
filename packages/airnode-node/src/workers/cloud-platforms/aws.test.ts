const invokeMock = jest.fn();
jest.mock('aws-sdk', () => ({
  Lambda: jest.fn().mockImplementation(() => ({
    invoke: invokeMock,
  })),
}));

import AWS from 'aws-sdk';
import * as aws from './aws';
import * as fixtures from '../../../test/fixtures';
import { WorkerParameters } from '../../types';

describe('spawn', () => {
  fixtures.setEnvVariables({ AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey() });

  it('derives the function name, invokes and returns the response', async () => {
    const lambda = new AWS.Lambda();
    const invoke = lambda.invoke as jest.Mock;
    invoke.mockImplementationOnce((_params, callback) =>
      callback(null, { Payload: JSON.stringify({ body: JSON.stringify({ value: 7777 }) }) })
    );
    const state = fixtures.buildEVMProviderState();
    const workerOpts = fixtures.buildWorkerOptions({
      cloudProvider: { type: 'aws', region: 'us-east-1', disableConcurrencyReservations: false },
    });
    const logOptions = fixtures.buildLogOptions();
    const parameters: WorkerParameters = {
      ...workerOpts,
      payload: { functionName: 'initializeProvider', state, logOptions },
    };
    const res = await aws.spawn(parameters);
    expect(res).toEqual({ value: 7777 });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith(
      {
        FunctionName: 'airnode-local02cce763-run',
        Payload: JSON.stringify({ functionName: 'initializeProvider', state, logOptions }),
      },
      expect.any(Function)
    );
  });

  it('throws an error if the lambda returns an error', async () => {
    const lambda = new AWS.Lambda();
    const invoke = lambda.invoke as jest.Mock;
    invoke.mockImplementationOnce((_params, callback) => callback(new Error('Something went wrong'), null));
    const state = fixtures.buildEVMProviderState();
    const workerOpts = fixtures.buildWorkerOptions({
      cloudProvider: { type: 'aws', region: 'us-east-1', disableConcurrencyReservations: false },
    });
    const logOptions = fixtures.buildLogOptions();
    const parameters: WorkerParameters = {
      ...workerOpts,
      payload: { functionName: 'initializeProvider', state, logOptions },
    };
    await expect(aws.spawn(parameters)).rejects.toThrow(new Error('Something went wrong'));
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith(
      {
        FunctionName: 'airnode-local02cce763-run',
        Payload: JSON.stringify({ functionName: 'initializeProvider', state, logOptions }),
      },
      expect.any(Function)
    );
  });
});
