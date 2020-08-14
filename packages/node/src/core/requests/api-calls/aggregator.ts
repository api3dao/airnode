import flatMap from 'lodash/flatMap';
import { updateArrayAt } from '../../utils/array-utils';
import { isDuplicate } from './model';
import { AggregatedApiCall, CoordinatorState } from '../../../types';

export function aggregate(state: CoordinatorState) {
  // Map all requests of the given type from all providers into a single array
  const allRequests = flatMap(state.providers, (_provider, index) => {
    const providerRequests = state.providers[index].requests.apiCalls;
    return providerRequests.map((request) => ({ ...request, providerIndex: Number(index) }));
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

    const uniqueApiCall: AggregatedApiCall = {
      id: request.id,
      endpointId: request.endpointId!,
      parameters: request.parameters,
      providers: [request.providerIndex],
      type: 'request',
    };

    // If this is the first time we're seeing this request, add it to the list of unique requests
    return [...acc, uniqueApiCall];
  }, []);

  return uniqueRequests;
}
