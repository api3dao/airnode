import { config } from '../../config';
import * as apiCalls from '../../requests/api-calls';
import { AggregatedApiCall, AggregatedApiCallsById, ApiCall, ClientRequest } from '../../../types';

function createAggregatedCall(request: ClientRequest<ApiCall>): AggregatedApiCall {
  const trigger = config.triggers.requests.find((t) => t.endpointId === request.endpointId);

  return {
    id: request.id,
    endpointId: request.endpointId!,
    parameters: request.parameters,
    type: 'request',
    // If the trigger was not found, the request will be invalidated at validation time
    endpointName: trigger?.endpointName,
    oisTitle: trigger?.oisTitle,
  };
}

export function aggregate(flatApiCalls: ClientRequest<ApiCall>[]): AggregatedApiCallsById {
  const aggregatedApiCallsById = flatApiCalls.reduce((acc: AggregatedApiCallsById, request) => {
    const existingAggregatedCalls = acc[request.id];

    // If this is the first time we're seeing this API call, then create a new aggregated API call
    if (!existingAggregatedCalls) {
      return {
        ...acc,
        [request.id]: [createAggregatedCall(request)],
      };
    }

    // Search the current list of aggregated API calls for a duplicate
    const duplicateApiCall = existingAggregatedCalls.find((aggregatedCall) => {
      return apiCalls.isDuplicate(request, aggregatedCall);
    });

    // NOTE: While unlikely, it is possible that a specific provider returns an API call
    // with the same ID as another request, but different endpointId & parameters. We want
    // to service all of these requests, so we need to keep both
    if (!duplicateApiCall) {
      return {
        ...acc,
        [request.id]: [...existingAggregatedCalls, createAggregatedCall(request)],
      };
    }

    // If this is the first time we're seeing this request, add it to the list of unique requests
    return acc;
  }, {});

  return aggregatedApiCallsById;
}
