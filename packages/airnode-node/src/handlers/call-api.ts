import { ApiCallResponse, ApiCallPayload, LogsData } from '../types';
import * as api from '../api';

export async function callApi(payload: ApiCallPayload): Promise<LogsData<ApiCallResponse>> {
  return api.callApi(payload);
}
