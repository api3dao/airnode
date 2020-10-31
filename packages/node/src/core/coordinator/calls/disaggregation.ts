import flatMap from 'lodash/flatMap';
import * as grouping from '../../requests/grouping';
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

function mapApiCalls(
  apiCalls: ClientRequest<ApiCall>[],
  aggregatedApiCallsById: AggregatedApiCallsById
): LogsData<ClientRequest<ApiCall>[]> {
  const logsWithApiCalls: LogsData<ClientRequest<ApiCall>>[] = apiCalls.map((apiCall) => {
    const aggregatedApiCall = aggregatedApiCallsById[apiCall.id];

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
  });

  const logs = flatMap(logsWithApiCalls, (a) => a[0]);
  const apiCallWithResponses = flatMap(logsWithApiCalls, (a) => a[1]);

  return [logs, apiCallWithResponses];
}

function mapEVMProviderState(
  state: ProviderState<EVMProviderState>,
  aggregatedApiCallsById: AggregatedApiCallsById
): LogsData<ProviderState<EVMProviderState>> {
  const requestsByRequesterIndex = grouping.groupRequestsByRequesterIndex(state.requests);
  const requesterIndices = Object.keys(requestsByRequesterIndex);

  const initialState: RequestsWithLogs = {
    logs: [],
    requests: { apiCalls: [], withdrawals: [] },
  };

  const { logs, requests } = requesterIndices.reduce((acc, requesterIndex) => {
    const { apiCalls, withdrawals } = requestsByRequesterIndex[requesterIndex];

    const [apiLogs, updatedApiCalls] = mapApiCalls(apiCalls, aggregatedApiCallsById);

    const updatedRequests = {
      ...acc.requests,
      apiCalls: [...acc.requests.apiCalls, ...updatedApiCalls],
      withdrawals: [...acc.requests.withdrawals, ...withdrawals],
    };

    return {
      ...acc,
      logs: [...acc.logs, ...apiLogs],
      requests: updatedRequests,
    };
  }, initialState);

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
