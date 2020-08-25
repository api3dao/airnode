import * as requestAggregation from '../requests/api-calls/aggregation';
import * as requestDisaggregation from '../requests/api-calls/disaggregation';
import { AggregatedApiCall, CoordinatorState, ProviderState } from '../../types';

export function aggregate(state: CoordinatorState): AggregatedApiCall[] {
  const aggregatedRequests = requestAggregation.aggregate(state);

  return aggregatedRequests;
}

export function disaggregate(state: CoordinatorState): ProviderState[] {
  const providersWithRequests = requestDisaggregation.disaggregate(state);

  return providersWithRequests;
}
