import fs from 'fs';
import * as adapter from '@api3/airnode-adapter';
import * as validator from '@api3/airnode-validator';
import { ethers } from 'ethers';
import * as coordinatedExecution from './coordinated-execution';
import * as fixtures from '../../../test/fixtures';
import * as workers from '../../workers/index';
import { LogOptions, RequestErrorMessage } from '../../types';

describe('callApis', () => {
  const logOptions: LogOptions = {
    format: 'plain',
    level: 'DEBUG',
    meta: { coordinatorId: '123456' },
  };

  it('filters out API calls that already have an error code', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest');
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({
      errorMessage: RequestErrorMessage.Unauthorized,
    });
    const workerOpts = fixtures.buildWorkerOptions();
    const [logs, res] = await coordinatedExecution.callApis([aggregatedApiCall], logOptions, workerOpts);
    expect(logs).toEqual([{ level: 'INFO', message: 'No pending API calls to process. Skipping API calls...' }]);
    expect(res).toEqual([aggregatedApiCall]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns each API call with the response if successful', async () => {
    const config = fixtures.buildConfig();
    jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(JSON.stringify(config));
    jest.spyOn(validator, 'validateJsonWithTemplate').mockReturnValueOnce({ valid: true, messages: [] });
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as jest.SpyInstance;
    spy.mockResolvedValueOnce({ data: { prices: ['443.76381', '441.83723'] } });
    const parameters = { _type: 'int256', _path: 'prices.1' };
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });
    const workerOpts = fixtures.buildWorkerOptions();

    const [logs, res] = await coordinatedExecution.callApis([aggregatedApiCall], logOptions, workerOpts);

    expect(logs.length).toEqual(4);
    expect(logs[0]).toEqual({ level: 'INFO', message: 'Processing 1 pending API call(s)...' });
    expect(logs[1].level).toEqual('INFO');
    expect(logs[1].message).toContain('API call to Endpoint:convertToUSD responded successfully in ');
    expect(logs[2]).toEqual({ level: 'INFO', message: 'Received 1 successful API call(s)' });
    expect(logs[3]).toEqual({ level: 'INFO', message: 'Received 0 errored API call(s)' });
    expect(res).toEqual([
      {
        ...aggregatedApiCall,
        responseValue: '0x0000000000000000000000000000000000000000000000000000000002a230ab',
        signature:
          '0x642caa669d72d10d019ac535cd5e2a7b7a67604ffe3ac659b4bec796971d6a51746b637f7934c0b94099aa876df60ac81d17023dddec66e090ce9ef1c47218791c',
        errorMessage: undefined,
      },
    ]);
    // Check that the correct value was selected
    expect(ethers.BigNumber.from(res[0].responseValue).toString()).toEqual('44183723');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('returns an error if the adapter fails to extract and encode the response value', async () => {
    const config = fixtures.buildConfig();
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));
    jest.spyOn(validator, 'validateJsonWithTemplate').mockReturnValue({ valid: true, messages: [] });
    const executeSpy = jest.spyOn(adapter, 'buildAndExecuteRequest') as jest.SpyInstance;
    executeSpy.mockResolvedValueOnce({ data: { prices: ['443.76381', '441.83723'] } });
    const extractSpy = jest.spyOn(adapter, 'extractAndEncodeResponse') as jest.SpyInstance;
    extractSpy.mockImplementation(() => {
      throw new Error('Unable to convert response');
    });
    const parameters = { from: 'ETH', _type: 'int256', _path: 'unknown' };
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });
    const workerOpts = fixtures.buildWorkerOptions();
    const [logs, res] = await coordinatedExecution.callApis([aggregatedApiCall], logOptions, workerOpts);
    expect(logs.length).toEqual(4);
    expect(logs[0]).toEqual({ level: 'INFO', message: 'Processing 1 pending API call(s)...' });
    expect(logs[1].level).toEqual('ERROR');
    expect(logs[1].message).toContain('API call to Endpoint:convertToUSD errored after ');
    expect(logs[1].message).toContain(`with error message:${RequestErrorMessage.ResponseValueNotFound}`);
    expect(logs[2]).toEqual({ level: 'INFO', message: 'Received 0 successful API call(s)' });
    expect(logs[3]).toEqual({ level: 'INFO', message: 'Received 1 errored API call(s)' });
    expect(res).toEqual([
      {
        ...aggregatedApiCall,
        response: undefined,
        errorMessage: RequestErrorMessage.ResponseValueNotFound,
      },
    ]);
    expect(executeSpy).toHaveBeenCalledTimes(1);
    expect(extractSpy).toHaveBeenCalledTimes(1);
  });

  it('returns an error if the API call fails', async () => {
    const config = fixtures.buildConfig();
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));
    jest.spyOn(validator, 'validateJsonWithTemplate').mockReturnValue({ valid: true, messages: [] });
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as jest.SpyInstance;
    spy.mockRejectedValueOnce(new Error('Unexpected error'));
    const parameters = { _type: 'int256', _path: 'prices.1' };
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });
    const workerOpts = fixtures.buildWorkerOptions();
    const [logs, res] = await coordinatedExecution.callApis([aggregatedApiCall], logOptions, workerOpts);
    expect(logs.length).toEqual(4);
    expect(logs[0]).toEqual({ level: 'INFO', message: 'Processing 1 pending API call(s)...' });
    expect(logs[1].level).toEqual('ERROR');
    expect(logs[1].message).toContain('API call to Endpoint:convertToUSD errored after ');
    expect(logs[1].message).toContain(`with error: Unexpected error`);
    expect(logs[2]).toEqual({ level: 'INFO', message: 'Received 0 successful API call(s)' });
    expect(logs[3]).toEqual({ level: 'INFO', message: 'Received 1 errored API call(s)' });
    expect(res).toEqual([
      {
        ...aggregatedApiCall,
        response: undefined,
        errorMessage: `${RequestErrorMessage.ApiCallFailed} with error: Unexpected error`,
      },
    ]);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('returns an error if the worker crashes', async () => {
    const spy = jest.spyOn(workers, 'spawn');
    spy.mockRejectedValueOnce(new Error('Worker crashed'));
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall();
    const workerOpts = fixtures.buildWorkerOptions();
    const [logs, res] = await coordinatedExecution.callApis([aggregatedApiCall], logOptions, workerOpts);
    expect(logs.length).toEqual(5);
    expect(logs[0]).toEqual({ level: 'INFO', message: 'Processing 1 pending API call(s)...' });
    expect(logs[1]).toEqual({
      level: 'ERROR',
      message: 'Unable to call API endpoint:convertToUSD',
      error: new Error('Worker crashed'),
    });
    expect(logs[2].level).toEqual('ERROR');
    expect(logs[2].message).toContain('API call to Endpoint:convertToUSD failed after ');
    expect(logs[3]).toEqual({ level: 'INFO', message: 'Received 0 successful API call(s)' });
    expect(logs[4]).toEqual({ level: 'INFO', message: 'Received 1 errored API call(s)' });
    expect(res).toEqual([
      {
        ...aggregatedApiCall,
        response: undefined,
        errorMessage: RequestErrorMessage.ApiCallFailed,
      },
    ]);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
