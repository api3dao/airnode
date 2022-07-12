import { ApiCallResponse, LogsData, RegularAggregatedApiCall, RegularApiCallConfig } from '../types';
import * as api from '../api';

export async function callApi(
  config: RegularApiCallConfig,
  aggregatedApiCall: RegularAggregatedApiCall
): Promise<LogsData<ApiCallResponse>> {
  return api.callApi({
    type: 'regular',
    config,
    aggregatedApiCall,
  });
}
