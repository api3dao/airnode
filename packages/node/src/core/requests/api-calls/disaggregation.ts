import * as logger from '../../utils/logger';
import { isDuplicate } from './model';
import { CoordinatorState, ProviderState, RequestErrorCode, RequestStatus } from '../../../types';

export function disaggregate(state: CoordinatorState): ProviderState[] {
  // We only care about aggregated API calls for requests
  const aggregatedApiCalls = state.aggregatedApiCalls.filter((ac) => ac.type === 'request');

  return state.providers.map((provider) => {
    const walletIndices = Object.keys(provider.walletDataByIndex);

    const walletDataByIndex = walletIndices.reduce((acc, index) => {
      const walletData = provider.walletDataByIndex[index];
      const { requests } = walletData;

      const updatedApiCalls = requests.apiCalls.map((apiCall) => {
        // Find the aggregated API call that matches the initial grouping and is required for this provider
        const aggregatedApiCall = aggregatedApiCalls.find((aggregatedCall) => {
          return (
            aggregatedCall.id === apiCall.id &&
            isDuplicate(apiCall, aggregatedCall) &&
            aggregatedCall.providers.includes(provider.index)
          );
        });

        // There should always be an aggregated API call when working backwards/ungrouping, but if there is
        // not we need to catch and log an error
        if (!aggregatedApiCall) {
          logger.logJSON('ERROR', `Unable to find matching aggregated API call for Request:${apiCall.id}`);
          return { apiCall, status: RequestStatus.Blocked, errorCode: RequestErrorCode.UnableToMatchAggregatedCall };
        }

        // Add the error to the ApiCall
        return { ...apiCall, error: aggregatedApiCall.error, response: aggregatedApiCall.response };
      });

      const updatedRequests = { ...requests, apiCalls: updatedApiCalls };
      const updatedWalletData = { ...walletData, requests: updatedRequests };

      return { ...acc, [index]: updatedWalletData };
    }, {});

    return { ...provider, walletDataByIndex };
  });
}
