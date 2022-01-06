import { AggregatedApiCall, AggregatedApiCallsById, ApiCall, Request, Config, RequestStatus } from '../../types';

function buildAggregatedCall(config: Config, request: Request<ApiCall>): AggregatedApiCall {
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
    type: 'regular',
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
  };
}

export function aggregate(config: Config, flatApiCalls: Request<ApiCall>[]): AggregatedApiCallsById {
  const aggregatedApiCallsById = flatApiCalls.reduce((acc: AggregatedApiCallsById, request) => {
    if (request.status !== RequestStatus.Pending) {
      return acc;
    }

    const existingAggregatedCall = acc[request.id];

    // If this is the first time we're seeing this API call, then create a new aggregated API call
    if (!existingAggregatedCall) {
      const aggregatedCall = buildAggregatedCall(config, request);
      return { ...acc, [request.id]: aggregatedCall };
    }

    // If this is the first time we're seeing this request, add it to the list of unique requests
    return acc;
  }, {});

  return aggregatedApiCallsById;
}
