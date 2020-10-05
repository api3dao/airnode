import flatMap from 'lodash/flatMap';
import flatten from 'lodash/flatten';
import * as logger from '../../logger';
import { isDuplicate } from '../../requests/api-calls';
import {
  AggregatedApiCallsById,
  ApiCall,
  ClientRequest,
  CoordinatorState,
  EVMProviderState,
  LogsData,
  PendingLog,
  ProviderState,
  RequestErrorCode,
  RequestStatus,
  WalletDataByIndex,
} from '../../../types';

interface WalletDataWithLogs {
  walletDataByIndex: WalletDataByIndex;
  logs: PendingLog[];
}

function mapApiCalls(
  apiCalls: ClientRequest<ApiCall>[],
  aggregatedApiCallsById: AggregatedApiCallsById
): LogsData<ClientRequest<ApiCall>[]> {
  const logsWithApiCalls: LogsData<ClientRequest<ApiCall>>[] = apiCalls.map((apiCall) => {
    const aggregatedApiCalls = aggregatedApiCallsById[apiCall.id];

    // NOTE: If different providers returned requests with the same ID, but different parameters
    // then there will be multiple aggregated API calls link given request ID. We need to find
    // the aggregated API call that matches the initial grouping
    const aggregatedApiCall = aggregatedApiCalls.find((aggregatedCall) => {
      return isDuplicate(apiCall, aggregatedCall);
    });

    // There should always be an aggregated API call when working backwards/ungrouping, but if there is
    // not we need to catch and log an error
    if (!aggregatedApiCall) {
      const log = logger.pend('ERROR', `Unable to find matching aggregated API call for Request:${apiCall.id}`);
      return [
        [log],
        { ...apiCall, status: RequestStatus.Blocked, errorCode: RequestErrorCode.UnableToMatchAggregatedCall },
      ];
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

function mapProviderState(
  state: ProviderState<EVMProviderState>,
  aggregatedApiCallsById: AggregatedApiCallsById
): LogsData<ProviderState<EVMProviderState>> {
  const initialState: WalletDataWithLogs = { logs: [], walletDataByIndex: {} };

  const walletIndices = Object.keys(state.walletDataByIndex);
  const { logs, walletDataByIndex } = walletIndices.reduce((acc, index) => {
    const walletData = state.walletDataByIndex[index];
    const { requests } = walletData;

    const [apiLogs, updatedApiCalls] = mapApiCalls(requests.apiCalls, aggregatedApiCallsById);
    const updatedRequests = { ...requests, apiCalls: updatedApiCalls };
    const updatedWalletData = { ...walletData, requests: updatedRequests };

    return {
      ...acc,
      logs: [...acc.logs, apiLogs],
      walletDataByIndex: { ...acc.walletDataByIndex, [index]: updatedWalletData },
    };
  }, initialState);

  return [flatten(logs), { ...state, walletDataByIndex }];
}

export function disaggregate(state: CoordinatorState): LogsData<ProviderState<EVMProviderState>[]> {
  const logsWithProviderStates = state.EVMProviders.map((provider) => {
    return mapProviderState(provider, state.aggregatedApiCallsById);
  });

  const logs = flatMap(logsWithProviderStates, (ps) => ps[0]);
  const providerStates = flatMap(logsWithProviderStates, (w) => w[1]);

  return [logs, providerStates];
}
