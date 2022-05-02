import orderBy from 'lodash/orderBy';
import { Request, GroupedRequests } from '../types';

export function sortRequests<T>(requests: Request<T>[]): Request<T>[] {
  // In order to keep consistency between runs, requests are sorted by the following criteria:
  //
  //   1. Block number (ascending)
  //   2. Log index (ascending)
  return orderBy(requests, ['metadata.blockNumber', 'metadata.logIndex']);
}

export function sortGroupedRequests(requests: GroupedRequests): GroupedRequests {
  return {
    apiCalls: sortRequests(requests.apiCalls),
    withdrawals: sortRequests(requests.withdrawals),
  };
}
