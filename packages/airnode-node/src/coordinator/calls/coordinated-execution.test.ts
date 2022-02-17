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
    jest.spyOn(validator, 'validateJsonWithTemplate').mockReturnValueOnce({ valid: true, messages: [], specs: config });
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
          '0x17b172685ff32e15b2a0db561014beeb426e135659cbfd080dd135b24eb87fbf3121845fdc02e47599018b19d02e9bce9fbd830e23e4735ecacf8f1a9a0d10ca1b',
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
    jest.spyOn(validator, 'validateJsonWithTemplate').mockReturnValue({ valid: true, messages: [], specs: config });
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
    expect(logs[1].message).toContain(`with error message:Unable to convert response`);
    expect(logs[2]).toEqual({ level: 'INFO', message: 'Received 0 successful API call(s)' });
    expect(logs[3]).toEqual({ level: 'INFO', message: 'Received 1 errored API call(s)' });
    expect(res).toEqual([
      {
        ...aggregatedApiCall,
        response: undefined,
        errorMessage: 'Unable to convert response',
      },
    ]);
    expect(executeSpy).toHaveBeenCalledTimes(1);
    expect(extractSpy).toHaveBeenCalledTimes(1);
  });

  it('returns an error if the API call fails', async () => {
    const config = fixtures.buildConfig();
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));
    jest.spyOn(validator, 'validateJsonWithTemplate').mockReturnValue({ valid: true, messages: [], specs: config });
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as jest.SpyInstance;
    spy.mockRejectedValueOnce(new Error('Unexpected error'));
    const parameters = { _type: 'int256', _path: 'prices.1' };
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });
    const workerOpts = fixtures.buildWorkerOptions();
    const [logs, res] = await coordinatedExecution.callApis([aggregatedApiCall], logOptions, workerOpts);
    expect(logs.length).toEqual(4);
    expect(logs[0]).toEqual({ level: 'INFO', message: 'Processing 1 pending API call(s)...' });
    expect(logs[1].level).toEqual('ERROR');
    // TODO: Change this error message since it does not read nice
    expect(logs[1].message).toMatch(
      /API call to Endpoint:convertToUSD errored after \d+ms with error message:API call failed/
    );
    expect(logs[2]).toEqual({ level: 'INFO', message: 'Received 0 successful API call(s)' });
    expect(logs[3]).toEqual({ level: 'INFO', message: 'Received 1 errored API call(s)' });
    expect(res).toEqual([
      {
        ...aggregatedApiCall,
        response: undefined,
        errorMessage: `${RequestErrorMessage.ApiCallFailed}`,
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
