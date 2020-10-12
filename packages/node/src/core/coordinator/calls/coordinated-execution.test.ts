jest.mock('../../config', () => ({
  config: {
    ois: [fixtures.ois],
    nodeSettings: { cloudProvider: 'local:aws' },
  },
  security: { apiCredentials: {} },
}));

import { ethers } from 'ethers';
import * as adapter from '@airnode/adapter';
import * as fixtures from 'test/fixtures';
import * as coordinatedExecution from './coordinated-execution';
import * as workers from '../../workers/index';
import { LogOptions, RequestErrorCode } from '../../../types';

describe('callApis', () => {
  const logOptions: LogOptions = {
    format: 'plain',
    meta: { coordinatorId: '123456' },
  };

  it('filters out API calls that already have an error code', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest');
    const aggregatedApiCallsById = {
      apiCallId: [fixtures.createAggregatedApiCall({ errorCode: RequestErrorCode.UnauthorizedClient })],
    };
    const [logs, res] = await coordinatedExecution.callApis(aggregatedApiCallsById, logOptions);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Received 0 successful API call(s)' },
      { level: 'INFO', message: 'Received 0 errored API call(s)' },
    ]);
    expect(res).toEqual({});
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns each API call with the response if successful', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as jest.SpyInstance;
    spy.mockResolvedValueOnce({ data: { prices: ['443.76381', '441.83723'] } });
    const parameters = { _type: 'int256', _path: 'prices.1' };
    const aggregatedApiCall = fixtures.createAggregatedApiCall({ parameters });
    const aggregatedApiCallsById = { 'request-123': [aggregatedApiCall] };
    const [logs, res] = await coordinatedExecution.callApis(aggregatedApiCallsById, logOptions);
    expect(logs.length).toEqual(3);
    expect(logs[0].level).toEqual('INFO');
    expect(logs[0].message).toContain('API call to Endpoint:convertToUsd responded successfully in ');
    expect(logs[1]).toEqual({ level: 'INFO', message: 'Received 1 successful API call(s)' });
    expect(logs[2]).toEqual({ level: 'INFO', message: 'Received 0 errored API call(s)' });
    expect(res).toEqual({
      apiCallId: [
        {
          ...aggregatedApiCall,
          responseValue: '0x0000000000000000000000000000000000000000000000000000000002a230ab',
          errorCode: undefined,
        },
      ],
    });
    // Check that the correct value was selected
    expect(ethers.BigNumber.from(res['apiCallId'][0].responseValue).toString()).toEqual('44183723');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('returns an error if the adapter fails to extract and encode the response value', async () => {
    const executeSpy = jest.spyOn(adapter, 'buildAndExecuteRequest') as jest.SpyInstance;
    executeSpy.mockResolvedValueOnce({ data: { prices: ['443.76381', '441.83723'] } });
    const extractSpy = jest.spyOn(adapter, 'extractAndEncodeResponse') as jest.SpyInstance;
    extractSpy.mockImplementation(() => {
      throw new Error('Unable to convert response');
    });
    const parameters = { from: 'ETH', _type: 'int256', _path: 'unknown' };
    const aggregatedApiCall = fixtures.createAggregatedApiCall({ parameters });
    const aggregatedApiCallsById = { apiCallId: [aggregatedApiCall] };
    const [logs, res] = await coordinatedExecution.callApis(aggregatedApiCallsById, logOptions);
    expect(logs.length).toEqual(3);
    expect(logs[0].level).toEqual('ERROR');
    expect(logs[0].message).toContain('API call to Endpoint:convertToUsd errored after ');
    expect(logs[0].message).toContain(`with error code:${RequestErrorCode.ResponseValueNotFound}`);
    expect(logs[1]).toEqual({ level: 'INFO', message: 'Received 0 successful API call(s)' });
    expect(logs[2]).toEqual({ level: 'INFO', message: 'Received 1 errored API call(s)' });
    expect(res).toEqual({
      apiCallId: [
        {
          ...aggregatedApiCall,
          response: undefined,
          errorCode: RequestErrorCode.ResponseValueNotFound,
        },
      ],
    });
    expect(executeSpy).toHaveBeenCalledTimes(1);
    expect(extractSpy).toHaveBeenCalledTimes(1);
  });

  it('returns an error if the API call fails', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as jest.SpyInstance;
    spy.mockRejectedValueOnce(new Error('API call failed'));
    const parameters = { _type: 'int256', _path: 'prices.1' };
    const aggregatedApiCall = fixtures.createAggregatedApiCall({ parameters });
    const aggregatedApiCallsById = { apiCallId: [aggregatedApiCall] };
    const [logs, res] = await coordinatedExecution.callApis(aggregatedApiCallsById, logOptions);
    expect(logs.length).toEqual(3);
    expect(logs[0].level).toEqual('ERROR');
    expect(logs[0].message).toContain('API call to Endpoint:convertToUsd errored after ');
    expect(logs[0].message).toContain(`with error code:${RequestErrorCode.ApiCallFailed}`);
    expect(logs[1]).toEqual({ level: 'INFO', message: 'Received 0 successful API call(s)' });
    expect(logs[2]).toEqual({ level: 'INFO', message: 'Received 1 errored API call(s)' });
    expect(res).toEqual({
      apiCallId: [
        {
          ...aggregatedApiCall,
          response: undefined,
          errorCode: RequestErrorCode.ApiCallFailed,
        },
      ],
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('returns an error if the worker crashes', async () => {
    const spy = jest.spyOn(workers, 'spawn');
    spy.mockRejectedValueOnce(new Error('Worker crashed'));
    const aggregatedApiCall = fixtures.createAggregatedApiCall();
    const aggregatedApiCallsById = { apiCallId: [aggregatedApiCall] };
    const [logs, res] = await coordinatedExecution.callApis(aggregatedApiCallsById, logOptions);
    expect(logs.length).toEqual(3);
    expect(logs[0].level).toEqual('ERROR');
    expect(logs[0].message).toContain('API call to Endpoint:convertToUsd failed after ');
    expect(logs[1]).toEqual({ level: 'INFO', message: 'Received 0 successful API call(s)' });
    expect(logs[2]).toEqual({ level: 'INFO', message: 'Received 1 errored API call(s)' });
    expect(res).toEqual({
      apiCallId: [
        {
          ...aggregatedApiCall,
          response: undefined,
          errorCode: RequestErrorCode.ApiCallFailed,
        },
      ],
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
