import flatMap from 'lodash/flatMap';
import * as logger from '../../logger';
import {
  AggregatedApiCallsById,
  ApiCall,
  ClientRequest,
  CoordinatorState,
  EVMProviderState,
  GroupedRequests,
  LogsData,
  PendingLog,
  ProviderState,
  RequestErrorCode,
  RequestStatus,
} from '../../../types';

export interface RequestsWithLogs {
  logs: PendingLog[];
  requests: GroupedRequests;
}

function updateApiCallResponse(
  apiCall: ClientRequest<ApiCall>,
  aggregatedApiCallsById: AggregatedApiCallsById
): LogsData<ClientRequest<ApiCall>> {
  const aggregatedApiCall = aggregatedApiCallsById[apiCall.id];

  // There should always be a matching AggregatedApiCall. Something has gone wrong if there isn't
  if (!aggregatedApiCall) {
    const log = logger.pend('ERROR', `Unable to find matching aggregated API calls for Request:${apiCall.id}`);
    const updatedCall = {
      ...apiCall,
      status: RequestStatus.Blocked,
      errorCode: RequestErrorCode.UnableToMatchAggregatedCall,
    };
    return [[log], updatedCall];
  }

  // Add the error to the ApiCall
  if (aggregatedApiCall.errorCode) {
    return [[], { ...apiCall, status: RequestStatus.Errored, errorCode: aggregatedApiCall.errorCode }];
  }

  return [[], { ...apiCall, responseValue: aggregatedApiCall.responseValue! }];
}

function mapEVMProviderState(
  state: ProviderState<EVMProviderState>,
  aggregatedApiCallsById: AggregatedApiCallsById
): LogsData<ProviderState<EVMProviderState>> {
  const logsWithApiCalls = state.requests.apiCalls.map((apiCall) => {
    return updateApiCallResponse(apiCall, aggregatedApiCallsById);
  });

  const logs = flatMap(logsWithApiCalls, (a) => a[0]);
  const apiCalls = flatMap(logsWithApiCalls, (a) => a[1]);
  const requests = { ...state.requests, apiCalls };

  return [logs, { ...state, requests }];
}

export function disaggregate(state: CoordinatorState): LogsData<ProviderState<EVMProviderState>[]> {
  const logsWithProviderStates = state.EVMProviders.map((provider) => {
    return mapEVMProviderState(provider, state.aggregatedApiCallsById);
  });

  const logs = flatMap(logsWithProviderStates, (ps) => ps[0]);
  const providerStates = flatMap(logsWithProviderStates, (w) => w[1]);

  return [logs, providerStates];
}
