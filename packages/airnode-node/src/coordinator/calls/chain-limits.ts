import flatMap from 'lodash/flatMap';
import groupBy from 'lodash/groupBy';
import map from 'lodash/map';
import zip from 'lodash/zip';
import * as logger from '../../logger';
import { sortRequests } from '../../requests';
import {
  Config,
  ProviderStates,
  Request,
  GroupedRequests,
  RequestType,
  ApiCall,
  Withdrawal,
  PendingLog,
} from '../../types';

function groupRequests(flatRequests: Request<any>[]): GroupedRequests {
  const apiCalls = flatRequests
    .filter((request) => request.__type === RequestType.ApiCall)
    .map((request) => request as Request<ApiCall>);

  const withdrawals = flatRequests
    .filter((request) => request.__type === RequestType.Withdrawal)
    .map((request) => request as Request<Withdrawal>);

  return { apiCalls, withdrawals };
}

export function applyChainLimits(config: Config, providerStates: ProviderStates) {
  const logs: PendingLog[] = [];

  const providerRequests = providerStates.evm
    .map((evmState, index) => {
      const { apiCalls, withdrawals } = evmState.requests;
      return { index, chainId: evmState.settings.chainId, requests: sortRequests([...apiCalls, ...withdrawals]) };
    })
    // Sort by number of request ascendingly
    .sort((p1, p2) => p1.requests.length - p2.requests.length);
  const groupedProviderRequests = groupBy(providerRequests, 'chainId');
  const chainRequests = map(groupedProviderRequests, (group, chainId) => ({
    chainId,
    chainLimit: config.chains.find((chain) => chain.id === chainId)!.maxConcurrentTransactions,
    requestsGroups: group,
  }));

  // Apply the chain request limit by dropping requests which exceed the limit. We do this mutably to increase
  // coordinator performance
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
  const updatedEvmState = zip(providerStates.evm, updatedGroups).map(([evmState, group]) => {
    return { ...evmState!, requests: groupRequests(group!.requests) };
  });
  const processedProviders = { evm: updatedEvmState };
  return [logs, processedProviders] as const;
}
