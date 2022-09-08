import { Config } from '../../config';
import { RegularAggregatedApiCall, RegularAggregatedApiCallsById, ApiCall, Request } from '../../types';

function buildRegularAggregatedCall(config: Config, request: Request<ApiCall>): RegularAggregatedApiCall {
  const {
    id,
    airnodeAddress,
    sponsorAddress,
    sponsorWalletAddress,
    metadata,
    endpointId,
    encodedParameters,
    requesterAddress,
    chainId,
    parameters,
    type,
    fulfillAddress,
    fulfillFunctionId,
    requestCount,
    templateId,
    template,
  } = request;
  // The trigger should already be verified to exist at this point
  const trigger = config.triggers.rrp.find((t) => t.endpointId === endpointId)!;

  return {
    id: id,
    sponsorAddress: sponsorAddress,
    airnodeAddress: airnodeAddress!,
    requesterAddress: requesterAddress,
    sponsorWalletAddress: sponsorWalletAddress,
    chainId: chainId,
    endpointId: endpointId!,
    parameters: parameters,
    endpointName: trigger.endpointName,
    oisTitle: trigger.oisTitle,
    requestType: type,
    metadata: metadata,
    encodedParameters,
    fulfillAddress,
    fulfillFunctionId,
    requestCount,
    templateId,
    template,
    cacheResponses: trigger.cacheResponses,
  };
}

export function aggregate(config: Config, flatApiCalls: Request<ApiCall>[]): RegularAggregatedApiCallsById {
  const aggregatedApiCallsById = flatApiCalls.reduce((acc: RegularAggregatedApiCallsById, request) => {
    const existingAggregatedCall = acc[request.id];

    // If this is the first time we're seeing this API call, then create a new aggregated API call
    if (!existingAggregatedCall) {
      const aggregatedCall = buildRegularAggregatedCall(config, request);
      return { ...acc, [request.id]: aggregatedCall };
    }

    // If this is the first time we're seeing this request, add it to the list of unique requests
    return acc;
  }, {});

  return aggregatedApiCallsById;
}
