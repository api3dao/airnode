jest.mock('../../config', () => ({
  config: {
    ois: [
      {
        title: 'oisTitle',
        endpoints: [
          {
            name: 'endpointName',
            reservedParameters: [
              { name: '_path', default: 'prices.1' },
              { name: '_type', default: 'int256' },
            ],
          },
        ],
      },
    ],
    nodeSettings: { cloudProvider: 'local:aws' },
  },
  security: { apiCredentials: {} },
}));

import { ethers } from 'ethers';
import * as adapter from '@airnode/adapter';
import * as fixtures from 'test/fixtures';
import * as coordinatedExecution from './coordinated-execution';
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
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockResolvedValueOnce({ data: { prices: ['443.76381', '441.83723'] } });
    const aggregatedApiCall = fixtures.createAggregatedApiCall();
    const aggregatedApiCallsById = { 'request-123': [aggregatedApiCall] };
    const [logs, res] = await coordinatedExecution.callApis(aggregatedApiCallsById, logOptions);
    expect(logs.length).toEqual(3);
    expect(logs[0].level).toEqual('INFO');
    expect(logs[0].message).toContain('API call to Endpoint:endpointName responded successfully in ');
    expect(logs[1]).toEqual({ level: 'INFO', message: 'Received 1 successful API call(s)' });
    expect(logs[2]).toEqual({ level: 'INFO', message: 'Received 0 errored API call(s)' });
    expect(res).toEqual({
      apiCallId: [
        {
          ...aggregatedApiCall,
          responseValue: '0x00000000000000000000000000000000000000000000000000000000000001b9',
          errorCode: undefined,
        },
      ],
    });
    // Check that the correct value was selected
    expect(ethers.BigNumber.from(res['apiCallId'][0].responseValue).toString()).toEqual('441');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  // it('returns an error if the API call fails', async () => {
  //   const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
  //   spy.mockRejectedValueOnce(new Error('API call failed'));
  //   const aggregatedApiCall = fixtures.createAggregatedApiCall();
  //   const aggregatedApiCalls = [aggregatedApiCall];
  //   const res = await coordinatedExecution.callApis(aggregatedApiCalls);
  //   expect(res[0]).toEqual({
  //     ...aggregatedApiCall,
  //     response: undefined,
  //     error: {
  //       errorCode: RequestErrorCode.ApiCallFailed,
  //       message: 'Failed to call Endpoint:endpointName. Error: API call failed',
  //     },
  //   });
  //   expect(spy).toHaveBeenCalledTimes(1);
  // });
  //
  // it('returns an error if the worker crashes', async () => {
  //   const spy = jest.spyOn(workers, 'spawn');
  //   spy.mockRejectedValueOnce(new Error('Worker crashed'));
  //   const aggregatedApiCall = fixtures.createAggregatedApiCall();
  //   const aggregatedApiCalls = [aggregatedApiCall];
  //   const res = await coordinatedExecution.callApis(aggregatedApiCalls);
  //   const resApiCall = removeKey(res[0], 'error');
  //   expect(resApiCall).toEqual({ ...aggregatedApiCall, response: undefined });
  //   expect(res[0].error!.errorCode).toEqual(RequestErrorCode.ApiCallFailed);
  //   expect(res[0].error!.message).toContain('API call to Endpoint:endpointName errored after');
  //   expect(res[0].error!.message).toContain('Error: Worker crashed');
  //   expect(spy).toHaveBeenCalledTimes(1);
  // });
});
