import { setLogOptions, LogOptions } from '@api3/airnode-utilities';
import { ApiCallResponse, LogsData, RegularAggregatedApiCall, RegularApiCallConfig } from '../types';
import * as api from '../api';

export async function callApi(
  config: RegularApiCallConfig,
  aggregatedApiCall: RegularAggregatedApiCall,
  logOptions: LogOptions
): Promise<LogsData<ApiCallResponse>> {
  setLogOptions(logOptions);
  return api.callApi({
    type: 'regular',
    config,
    aggregatedApiCall,
  });
}
