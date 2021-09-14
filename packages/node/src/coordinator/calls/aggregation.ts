import { AggregatedApiCall, AggregatedApiCallsById, ApiCall, ClientRequest, Config, RequestStatus } from '../../types';

function buildAggregatedCall(config: Config, request: ClientRequest<ApiCall>): AggregatedApiCall {
  // The trigger should already be verified to exist at this point
  const trigger = config.triggers.rrp.find((t) => t.endpointId === request.endpointId)!;

  return {
    id: request.id,
    requesterIndex: request.requesterIndex,
    airnodeId: request.airnodeId!,
    clientAddress: request.clientAddress,
    designatedWallet: request.designatedWallet,
    chainId: request.chainId,
    endpointId: request.endpointId!,
    parameters: request.parameters,
    endpointName: trigger.endpointName,
    oisTitle: trigger.oisTitle,
  };
}

export function aggregate(config: Config, flatApiCalls: ClientRequest<ApiCall>[]): AggregatedApiCallsById {
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
