const invokeMock = jest.fn();
jest.mock('aws-sdk', () => ({
  Lambda: jest.fn().mockImplementation(() => ({
    invoke: invokeMock,
  })),
}));

import AWS from 'aws-sdk';
import * as aws from './aws';
import * as fixtures from '../../../test/fixtures';
import { WorkerFunctionName } from '../../types';

describe('spawn', () => {
  it('derives the function name, invokes and returns the response', async () => {
    const lambda = new AWS.Lambda();
    const invoke = lambda.invoke as jest.Mock;
    invoke.mockImplementationOnce((params, callback) =>
      callback(null, { Payload: JSON.stringify({ body: JSON.stringify({ value: 7777 }) }) })
    );
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: 'aws' });
    const parameters = {
      ...workerOpts,
      functionName: 'some-function' as WorkerFunctionName,
      payload: { from: 'ETH', to: 'USD' },
    };
    const res = await aws.spawn(parameters);
    expect(res).toEqual({ value: 7777 });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith(
      {
        FunctionName: 'airnode-19255a4-test-some-function',
        Payload: JSON.stringify({ from: 'ETH', to: 'USD' }),
      },
      expect.any(Function)
    );
  });

  it('throws an error if the lambda returns an error', async () => {
    expect.assertions(3);
    const lambda = new AWS.Lambda();
    const invoke = lambda.invoke as jest.Mock;
    invoke.mockImplementationOnce((params, callback) => callback(new Error('Something went wrong'), null));
    const workerOpts = fixtures.buildWorkerOptions({ cloudProvider: 'aws' });
    const parameters = {
      ...workerOpts,
      functionName: 'some-function' as WorkerFunctionName,
      payload: { from: 'ETH', to: 'USD' },
    };
    // eslint-disable-next-line functional/no-try-statement
    try {
      await aws.spawn(parameters);
    } catch (e) {
      expect(e).toEqual(new Error('Something went wrong'));
    }
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith(
      {
        FunctionName: 'airnode-19255a4-test-some-function',
        Payload: JSON.stringify({ from: 'ETH', to: 'USD' }),
      },
      expect.any(Function)
    );
  });
});
