import * as logger from '../../logger';
import { isDuplicate } from '../../requests/api-calls';
import {
  ApiCall,
  ClientRequest,
  CoordinatorState,
  ProviderState,
  RequestErrorCode,
  RequestStatus,
} from '../../../types';

export function disaggregate(state: CoordinatorState): ProviderState[] {
  // We only care about aggregated API calls for requests. There might be other types in the future
  const aggregatedApiCalls = state.aggregatedApiCalls.filter((ac) => ac.type === 'request');

  return state.providers.map((provider) => {
    const walletIndices = Object.keys(provider.walletDataByIndex);

    const walletDataByIndex = walletIndices.reduce((acc, index) => {
      const walletData = provider.walletDataByIndex[index];
      const { requests } = walletData;

      const updatedApiCalls: ClientRequest<ApiCall>[] = requests.apiCalls.map((apiCall) => {
        // Find the aggregated API call that matches the initial grouping and is required for this provider
        const aggregatedApiCall = aggregatedApiCalls.find((aggregatedCall) => {
          return isDuplicate(apiCall, aggregatedCall) && aggregatedCall.providers.includes(provider.index);
        });

        // There should always be an aggregated API call when working backwards/ungrouping, but if there is
        // not we need to catch and log an error
        if (!aggregatedApiCall) {
          logger.logJSON('ERROR', `Unable to find matching aggregated API call for Request:${apiCall.id}`);
          return { ...apiCall, status: RequestStatus.Blocked, errorCode: RequestErrorCode.UnableToMatchAggregatedCall };
        }

        // Add the error to the ApiCall
        if (aggregatedApiCall.error?.errorCode) {
          return { ...apiCall, status: RequestStatus.Errored, errorCode: aggregatedApiCall.error.errorCode };
        }

        return { ...apiCall, response: aggregatedApiCall.response };
      });

      const updatedRequests = { ...requests, apiCalls: updatedApiCalls };
      const updatedWalletData = { ...walletData, requests: updatedRequests };

      return { ...acc, [index]: updatedWalletData };
    }, {});

    return { ...provider, walletDataByIndex };
  });
}
