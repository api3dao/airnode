import * as requestAggregation from '../requests/api-calls/aggregation';
import * as requestDisaggregation from '../requests/api-calls/disaggregation';
import { AggregatedApiCall, CoordinatorState, ProviderState } from '../../types';

export function aggregate(state: CoordinatorState): AggregatedApiCall[] {
  return requestAggregation.aggregate(state);
}

export function disaggregate(state: CoordinatorState): ProviderState[] {
  return requestDisaggregation.disaggregate(state);
}
