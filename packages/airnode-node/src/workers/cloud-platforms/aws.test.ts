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
  it('derives the function name, invokes and returns the response', async () => {
    const lambda = new AWS.Lambda();
    const invoke = lambda.invoke as jest.Mock;
    invoke.mockImplementationOnce((params, callback) =>
      callback(null, { Payload: JSON.stringify({ body: JSON.stringify({ value: 7777 }) }) })
    );
    const state = fixtures.buildEVMProviderState();
    const workerOpts = fixtures.buildWorkerOptions({
      cloudProvider: { type: 'aws', region: 'us-east-1', disableConcurrencyReservations: false },
    });
    const parameters: WorkerParameters = {
      ...workerOpts,
      payload: { functionName: 'initializeProvider', state },
    };
    const res = await aws.spawn(parameters);
    expect(res).toEqual({ value: 7777 });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith(
      {
        FunctionName: 'airnode-19255a4-test-run',
        Payload: JSON.stringify({ functionName: 'initializeProvider', state }),
      },
      expect.any(Function)
    );
  });

  it('throws an error if the lambda returns an error', async () => {
    const lambda = new AWS.Lambda();
    const invoke = lambda.invoke as jest.Mock;
    invoke.mockImplementationOnce((params, callback) => callback(new Error('Something went wrong'), null));
    const state = fixtures.buildEVMProviderState();
    const workerOpts = fixtures.buildWorkerOptions({
      cloudProvider: { type: 'aws', region: 'us-east-1', disableConcurrencyReservations: false },
    });
    const parameters: WorkerParameters = {
      ...workerOpts,
      payload: { functionName: 'initializeProvider', state },
    };
    await expect(aws.spawn(parameters)).rejects.toThrow(new Error('Something went wrong'));
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith(
      {
        FunctionName: 'airnode-19255a4-test-run',
        Payload: JSON.stringify({ functionName: 'initializeProvider', state }),
      },
      expect.any(Function)
    );
  });
});
