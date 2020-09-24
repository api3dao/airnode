import { config } from '../../config';
import { updateArrayAt } from '../../utils/array-utils';
import * as apiCalls from '../../requests/api-calls';
import { AggregatedApiCall, ApiCall, ClientRequest } from '../../../types';

export function aggregate(flatApiCalls: ClientRequest<ApiCall>[]): AggregatedApiCall[] {
  const uniqueRequests = flatApiCalls.reduce((acc: AggregatedApiCall[], request) => {
    // Search the current list of aggregated API calls for a duplicate
    const duplicateApiCallIndex = acc.findIndex((aggregatedCall) => {
      return apiCalls.isDuplicate(request, aggregatedCall);
    });

    // If a duplicate request is found, add the provider to the list of providers that reported it
    if (duplicateApiCallIndex >= 0) {
      return updateArrayAt(acc, duplicateApiCallIndex, (dupRequest) => ({
        ...dupRequest,
        providers: [...dupRequest.providers, request.metadata.providerIndex],
      }));
    }

    const trigger = config.triggers.requests.find((t) => t.endpointId === request.endpointId);

    // If this is the first time we're seeing this API call, then create a new aggregated API call
    const uniqueApiCall: AggregatedApiCall = {
      id: request.id,
      endpointId: request.endpointId!,
      parameters: request.parameters,
      providers: [request.metadata.providerIndex],
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
