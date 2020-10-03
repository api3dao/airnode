import flatMap from 'lodash/flatMap';
import * as logger from '../../logger';
import { isDuplicate } from '../../requests/api-calls';
import {
  AggregatedApiCall,
  ApiCall,
  ClientRequest,
  CoordinatorState,
  LogsData,
  ProviderState,
  RequestErrorCode,
  RequestStatus,
} from '../../../types';

function mapApiCalls(
  apiCalls: ClientRequest<ApiCall>[],
  aggregatedApiCalls: AggregatedApiCall[]
): LogsData<ClientRequest<ApiCall>[]> {
  const logsWithApiCalls: LogsData<ClientRequest<ApiCall>>[] = apiCalls.map((apiCall) => {
    // Find the aggregated API call that matches the initial grouping and is required for this provider
    const aggregatedApiCall = aggregatedApiCalls.find((aggregatedCall) => {
      return isDuplicate(apiCall, aggregatedCall) && aggregatedCall.providers.includes(apiCall.metadata.providerIndex);
    });

    // There should always be an aggregated API call when working backwards/ungrouping, but if there is
    // not we need to catch and log an error
    if (!aggregatedApiCall) {
      const log = logger.pend('ERROR', `Unable to find matching aggregated API call for Request:${apiCall.id}`);
      return [[log], { ...apiCall, status: RequestStatus.Blocked, errorCode: RequestErrorCode.UnableToMatchAggregatedCall }];
    }

    // Add the error to the ApiCall
    if (aggregatedApiCall.errorCode) {
      return [[], { ...apiCall, status: RequestStatus.Errored, errorCode: aggregatedApiCall.errorCode }];
    }

    return [[], { ...apiCall, responseValue: aggregatedApiCall.responseValue! }];
  });
  const logs = flatMap(logsWithApiCalls, a => a[0]);
  const apiCallWithResponses = flatMap(logsWithApiCalls, a => a[1]);
  return [logs, apiCallWithResponses];
}

export function disaggregate<T>(state: CoordinatorState): ProviderState<T>[] {
  // We only care about aggregated API calls for requests. There might be other types in the future
  const aggregatedApiCalls = state.aggregatedApiCalls.filter((ac) => ac.type === 'request');

  return state.providers.map((provider) => {
    const walletIndices = Object.keys(provider.walletDataByIndex);

    const walletDataByIndex = walletIndices.reduce((acc, index) => {
      const walletData = provider.walletDataByIndex[index];
      const { requests } = walletData;

      const updatedApiCalls = mapApiCalls(requests.apiCalls, aggregatedApiCalls);
      const updatedRequests = { ...requests, apiCalls: updatedApiCalls };
      const updatedWalletData = { ...walletData, requests: updatedRequests };

      return { ...acc, [index]: updatedWalletData };
    }, {});

    return { ...provider, walletDataByIndex };
  });
}
