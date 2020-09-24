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
import * as workers from '../../workers/index';
import { removeKey } from '../../utils/object-utils';
import { ApiCallError, RequestErrorCode } from '../../../types';

describe('callApis', () => {
  it('filters out API calls that already have an error code', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest');
    const error: ApiCallError = { errorCode: RequestErrorCode.UnauthorizedClient };
    const aggregatedApiCalls = [fixtures.createAggregatedApiCall({ error })];
    const res = await coordinatedExecution.callApis(aggregatedApiCalls);
    expect(res).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns each API call with the response if successful', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockResolvedValueOnce({ data: { prices: ['443.76381', '441.83723'] } });
    const aggregatedApiCall = fixtures.createAggregatedApiCall();
    const aggregatedApiCalls = [aggregatedApiCall];
    const res = await coordinatedExecution.callApis(aggregatedApiCalls);
    expect(res[0]).toEqual({
      ...aggregatedApiCall,
      response: {
        value: '0x00000000000000000000000000000000000000000000000000000000000001b9',
      },
      error: undefined,
    });
    // Check that the correct value was selected
    expect(ethers.BigNumber.from(res[0].response!.value).toString()).toEqual('441');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('returns an error if the API call fails', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockRejectedValueOnce(new Error('API call failed'));
    const aggregatedApiCall = fixtures.createAggregatedApiCall();
    const aggregatedApiCalls = [aggregatedApiCall];
    const res = await coordinatedExecution.callApis(aggregatedApiCalls);
    expect(res[0]).toEqual({
      ...aggregatedApiCall,
      response: undefined,
      error: {
        errorCode: RequestErrorCode.ApiCallFailed,
        message: 'Failed to call Endpoint:endpointName. Error: API call failed',
      },
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('returns an error if the worker crashes', async () => {
    const spy = jest.spyOn(workers, 'spawn');
    spy.mockRejectedValueOnce(new Error('Worker crashed'));
    const aggregatedApiCall = fixtures.createAggregatedApiCall();
    const aggregatedApiCalls = [aggregatedApiCall];
    const res = await coordinatedExecution.callApis(aggregatedApiCalls);
    const resApiCall = removeKey(res[0], 'error');
    expect(resApiCall).toEqual({ ...aggregatedApiCall, response: undefined });
    expect(res[0].error!.errorCode).toEqual(RequestErrorCode.ApiCallFailed);
    expect(res[0].error!.message).toContain('API call to Endpoint:endpointName errored after');
    expect(res[0].error!.message).toContain('Error: Worker crashed');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
