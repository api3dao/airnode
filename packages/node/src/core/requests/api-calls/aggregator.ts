import flatMap from 'lodash/flatMap';
import isEqual from 'lodash/isEqual';
import { updateArrayAt } from '../../utils/array-utils';
import { removeKeys } from '../../utils/object-utils';
import { AggregatedRequest, CoordinatorState, GroupedProviderRequests } from '../../../types';

type RequestType = keyof GroupedProviderRequests;

export function aggregate<T>(state: CoordinatorState, requestType: RequestType): AggregatedRequest<T>[] {
  const providerIndices = Object.keys(state.providers);

  // Map all requests of the given type from all providers into a single array
  const allRequests = flatMap(providerIndices, (index) => {
    const providerRequests = state.providers[index].requests[requestType] as any;
    return providerRequests.map((request: AggregatedRequest<T>) => ({ ...request, providers: [Number(index)] }));
  });

  const uniqueRequests = allRequests.reduce((acc, request) => {
    const duplicateRequestIndex = acc.findIndex((r: any)  => {
      // Certain keys are not important when comparing requests
      const ignoredKeys = ['providers', 'walletBalance', 'walletMinimumBalance'];
      // First compare the ID as it's much faster, if there is a matching request then compare the
      // rest of the attributes
      return request.id === r.id && isEqual(removeKeys(request, ignoredKeys), removeKeys(r, ignoredKeys));
    });

    // If a duplicate request is found, add the provider to the list of providers that reported it
    if (duplicateRequestIndex >= 0) {
      return updateArrayAt(
        acc,
        duplicateRequestIndex,
        (dupRequest) => ({ ...request, providers: [...dupRequest.providers, ...request.providers] })
      );
    }

    // If this is the first time we're seeing this request, add it to the list of unique requests
    return [...acc, request];
  }, []);

  return uniqueRequests;
}

