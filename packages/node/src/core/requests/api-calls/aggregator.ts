import flatMap from 'lodash/flatMap';
import { config } from '../../config';
import { updateArrayAt } from '../../utils/array-utils';
import * as logger from '../../utils/logger';
import { isDuplicate } from './model';
import {
  AggregatedApiCall,
  ApiCall,
  ClientRequest,
  CoordinatorState,
  ProviderState,
} from '../../../types';

export function aggregate(state: CoordinatorState): AggregatedApiCall[] {
  // Map all requests of the given type from all providers into a single array
  const allRequests = flatMap(state.providers, (provider) => {
    const providerRequests = state.providers[provider.index].requests.apiCalls;
    return providerRequests.map((request) => ({ ...request, providerIndex: provider.index }));
  });

  const uniqueRequests = allRequests.reduce((acc: AggregatedApiCall[], request) => {
    const duplicateApiCallIndex = acc.findIndex((aggregatedCall) => {
      // First compare the ID as it's much faster, if there is a matching request then compare the
      // rest of the (relevant) attributes
      return request.id === aggregatedCall.id && isDuplicate(request, aggregatedCall);
    });

    // If a duplicate request is found, add the provider to the list of providers that reported it
    if (duplicateApiCallIndex >= 0) {
      return updateArrayAt(acc, duplicateApiCallIndex, (dupRequest) => ({
        ...dupRequest,
        providers: [...dupRequest.providers, request.providerIndex],
      }));
    }

    const trigger = config.triggers.requests.find((t) => t.endpointId === request.endpointId);

    const uniqueApiCall: AggregatedApiCall = {
      id: request.id,
      endpointId: request.endpointId!,
      parameters: request.parameters,
      providers: [request.providerIndex],
      type: 'request',
      // If the trigger was not found, the request will be invalidated at validation time
      endpointName: trigger?.endpointName,
      oisTitle: trigger?.oisTitle,
    };

    // If this is the first time we're seeing this request, add it to the list of unique requests
    return [...acc, uniqueApiCall];
  }, []);

  return uniqueRequests;
}

export function segregate(state: CoordinatorState): ProviderState[] {
  // We only care about aggregated API calls for requests
  const aggregatedApiCalls = state.aggregatedApiCalls.filter((ac) => ac.type === 'request');

  return state.providers.map((provider) => {
    const apiCalls: ClientRequest<ApiCall>[] = provider.requests.apiCalls.map((apiCallRequest) => {
      // Find the aggregated API call that matches the initial grouping and is required for this provider
      const aggregatedApiCall = aggregatedApiCalls.find((ac) => {
        return ac.id === apiCallRequest.id && isDuplicate(apiCallRequest, ac) && ac.providers.includes(provider.index);
      });

      // There should always be an aggregated API call when working backwards/ungrouping, but if there is
      // not we need to catch and log an error
      if (!aggregatedApiCall) {
        logger.logJSON('ERROR', `Unable to find matching aggregated API call for Request:${apiCallRequest.id}`);
        return apiCallRequest;
      }

      // Add the error to the ApiCall
      return { ...apiCallRequest, error: aggregatedApiCall.error, response: aggregatedApiCall.response };
    });

    return { ...provider, requests: { ...provider.requests, apiCalls } };
  });
}
