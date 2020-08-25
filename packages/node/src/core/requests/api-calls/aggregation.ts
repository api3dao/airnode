import flatMap from 'lodash/flatMap';
import { config } from '../../config';
import { updateArrayAt } from '../../utils/array-utils';
import { isDuplicate } from './model';
import { AggregatedApiCall, CoordinatorState } from '../../../types';

function flattenApiCalls(state: CoordinatorState) {
  // Map all API call requests from all providers into a single array with their provider index
  const allRequests = flatMap(state.providers, (provider) => {
    const walletIndices = Object.keys(provider.walletDataByIndex);
    const providerRequests = flatMap(
      walletIndices.map((index) => {
        return provider.walletDataByIndex[index].requests.apiCalls;
      })
    );
    return providerRequests.map((request) => ({ ...request, providerIndex: provider.index }));
  });

  return allRequests;
}

export function aggregate(state: CoordinatorState): AggregatedApiCall[] {
  const allRequests = flattenApiCalls(state);

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
