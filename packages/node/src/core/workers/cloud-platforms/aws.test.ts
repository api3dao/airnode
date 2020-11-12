const invokeMock = jest.fn();
jest.mock('aws-sdk', () => ({
  Lambda: jest.fn().mockImplementation(() => ({
    invoke: invokeMock,
  })),
}));

const customFnMock = jest.fn();
jest.mock('../../../aws/handler', () => ({
  myCustomFn: customFnMock,
}));

import AWS from 'aws-sdk';
import * as aws from './aws';
import * as fixtures from 'test/fixtures';

describe('spawn', () => {
  it('invokes the lambda and returns the response', async () => {
    const lambda = new AWS.Lambda();
    const invoke = lambda.invoke as jest.Mock;
    invoke.mockImplementationOnce((params, callback) => callback(null, { value: 7777 }));
    const config = fixtures.buildConfig();
    const parameters = {
      config,
      functionName: 'some-function',
      payload: { from: 'ETH', to: 'USD' },
      providerIdShort: '19255a4',
      region: 'us-east-1',
      stage: 'test',
    };
    const res = await aws.spawn(parameters);
    expect(res).toEqual({ value: 7777 });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith(
      {
        FunctionName: 'some-function',
        Payload: JSON.stringify({ from: 'ETH', to: 'USD', config }),
      },
      expect.any(Function)
    );
  });

  it('throws an error if the lambda returns an error', async () => {
    expect.assertions(3);
    const lambda = new AWS.Lambda();
    const invoke = lambda.invoke as jest.Mock;
    invoke.mockImplementationOnce((params, callback) => callback(new Error('Something went wrong'), null));
    const config = fixtures.buildConfig();
    const parameters = {
      config,
      functionName: 'some-function',
      payload: { from: 'ETH', to: 'USD' },
      providerIdShort: '19255a4',
      region: 'us-east-1',
      stage: 'test',
    };
    try {
      await aws.spawn(parameters);
    } catch (e) {
      expect(e).toEqual(new Error('Something went wrong'));
    }
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith(
      {
        FunctionName: 'some-function',
        Payload: JSON.stringify({ from: 'ETH', to: 'USD', config }),
      },
      expect.any(Function)
    );
  });
});

describe('spawnLocal', () => {
  it('invokes the function and decodes the response', async () => {
    const response = { body: JSON.stringify({ value: 1000 }) };
    customFnMock.mockImplementationOnce(() => Promise.resolve(response));
    const parameters = {
      config: fixtures.buildConfig(),
      functionName: 'myCustomFn',
      payload: { from: 'ETH', to: 'USD' },
      providerIdShort: '19255a4',
      region: 'us-east-1',
      stage: 'test',
    };
    const res = await aws.spawnLocal(parameters);
    expect(res).toEqual({ value: 1000 });
  });

  it('throws an error if the lambda returns an error', async () => {
    expect.assertions(3);
    const response = new Error('Server says no');
    customFnMock.mockImplementationOnce(() => Promise.reject(response));
    const config = fixtures.buildConfig();
    const parameters = {
      config,
      functionName: 'myCustomFn',
      payload: {
        from: 'ETH',
        to: 'USD',
      },
      providerIdShort: '19255a4',
      region: 'us-east-1',
      stage: 'test',
    };
    try {
      await aws.spawnLocal(parameters);
    } catch (e) {
      expect(e).toEqual(new Error('Server says no'));
    }
    expect(customFnMock).toHaveBeenCalledTimes(1);
    expect(customFnMock).toHaveBeenCalledWith({
      parameters: {
        from: 'ETH',
        to: 'USD',
        config,
      },
    });
  });

  it('throws an error if the function is not found', async () => {
    expect.assertions(1);
    const parameters = {
      config: fixtures.buildConfig(),
      functionName: 'unknownFn',
      payload: {
        from: 'ETH',
        to: 'USD',
      },
    };
    try {
      await aws.spawnLocal(parameters);
    } catch (e) {
      expect(e).toEqual(new Error("Cannot find AWS function: 'unknownFn'"));
    }
  });
});
