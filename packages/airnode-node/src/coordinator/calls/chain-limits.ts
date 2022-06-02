import flatMap from 'lodash/flatMap';
import groupBy from 'lodash/groupBy';
import map from 'lodash/map';
import zipWith from 'lodash/zipWith';
import { logger, PendingLog } from '@api3/airnode-utilities';
import { ProviderStates, GroupedRequests } from '../../types';
import { flattenRequests, groupRequests } from '../../requests/grouping';
import { sortRequests } from '../../requests/sorting';
import { Config } from '../../config';

function flattenAndSortRequests(grouped: GroupedRequests) {
  return sortRequests(flattenRequests(grouped));
}

// Apply the chain request limit by dropping requests which exceed the limit. We do this mutably to increase
// performance. This algorithm runs in O(P), where P = number of providers across all chains. When the chain limit is
// exceeded, the latest requests of the largest provider shall be dropped.
//
// The algorithm works as follows:
// 1. Sort the providers by the number of actionable requests they reported
// 2. Group the provider requests by the chain they operate on. Then for each chain do the following:
//    1. Initialize available request limit (say A) to the chain limit specified in config.json
//    2. Take the smallest unprocessed group of provider requests
//    3. Take the maximum number of requests (say M) as you can. Let's say the current provider request count is R and
//       there are N unprocessed providers (including the one currently processing). Then M = max(A / N, R). This is
//       because taking M requests of the current provider implies taking M request from the others.
//    4. Pick the oldest M request and discard other (extraneous) requests.
//    5. Update A by subtracting M, go step 2.
//
// This algorithm naturally favours providers with smaller number of requests, while it also maximizes the number of
// requests taken. E.g. N = 10, A = 56, R = 10. Then the algorithm picks (5,5,5,5,6,6,6,6,6). In general, if R > A / n,
// then all providers end up with at least A / N request and last (A % N) end up with +1.
export function applyChainLimits(config: Config, providerStates: ProviderStates) {
  const logs: PendingLog[] = [];

  const providerRequests = providerStates.evm
    .map((evmState, index) => {
      return { index, chainId: evmState.settings.chainId, requests: flattenAndSortRequests(evmState.requests) };
    })
    // Sort by number of request in an ascending order
    .sort((p1, p2) => p1.requests.length - p2.requests.length);
  const groupedProviderRequests = groupBy(providerRequests, 'chainId');
  // Group providers by the chain they operate on.
  const chainRequests = map(groupedProviderRequests, (groups, chainId) => ({
    chainId,
    chainLimit: config.chains.find((chain) => chain.id === chainId)!.maxConcurrency,
    requestsGroups: groups,
  }));

  // Apply the core algorithm and drop requests which exceed the chain limit. We do this mutable to preserve the
  // performance.
  chainRequests.forEach((chain) => {
    const groupsCount = chain.requestsGroups.length;
    let remainingChainLimit = chain.chainLimit;

    chain.requestsGroups.forEach((group, groupIndex) => {
      const requestCount = group.requests.length;
      const unprocessedGroupsCount = groupsCount - groupIndex;

      const allowedRequestCount = Math.min(Math.floor(remainingChainLimit / unprocessedGroupsCount), requestCount);
      group.requests.slice(allowedRequestCount).forEach((req) => {
        logs.push(
          logger.pend(
            'INFO',
            `Ignoring request with ID:${req.id} on chain:${chain.chainId} because it exceeded chain limit:${chain.chainLimit}`
          )
        );
      });
      // eslint-disable-next-line functional/immutable-data
      group.requests = group.requests.slice(0, allowedRequestCount);
      remainingChainLimit -= group.requests.length;
    });
  });

  const updatedGroups = flatMap(chainRequests, (chain) => chain.requestsGroups).sort((g1, g2) => g1.index - g2.index);
  const updatedEvmState = zipWith(providerStates.evm, updatedGroups, (evmState, group) => {
    return { ...evmState, requests: groupRequests(group.requests) };
  });
  const processedProviders = { evm: updatedEvmState };
  return [logs, processedProviders] as const;
}
