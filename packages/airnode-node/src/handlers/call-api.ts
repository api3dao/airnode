import { LogsData, ApiCallResponse } from '../types';
import * as api from '../api';

export async function callApi(payload: api.CallApiPayload): Promise<LogsData<ApiCallResponse>> {
  return api.callApi(payload);
}
