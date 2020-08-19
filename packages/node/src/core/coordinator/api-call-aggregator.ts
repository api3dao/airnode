import * as requestAggregator from '../requests/api-calls/aggregator';
import { AggregatedApiCall, CoordinatorState, ProviderState } from '../../types';

export function aggregate(state: CoordinatorState): AggregatedApiCall[] {
  const aggregatedRequests = requestAggregator.aggregate(state);

  return aggregatedRequests;
}

export function segregate(state: CoordinatorState): ProviderState[] {
  const providersWithRequests = requestAggregator.segregate(state);

  return providersWithRequests;
}
