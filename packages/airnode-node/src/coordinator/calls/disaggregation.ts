import flatMap from 'lodash/flatMap';
import { logger } from '@api3/airnode-utilities';
import {
  RegularAggregatedApiCallsWithResponseById,
  ApiCall,
  ApiCallWithResponse,
  Request,
  CoordinatorStateWithApiResponses,
  EVMProviderState,
  LogsData,
  ProviderState,
  UpdatedRequests,
} from '../../types';

function updateApiCallResponses(
  apiCalls: Request<ApiCall>[],
  aggregatedApiCallsById: RegularAggregatedApiCallsWithResponseById
): LogsData<Request<ApiCallWithResponse>[]> {
  const { logs, requests } = apiCalls.reduce(
    (acc, apiCall): UpdatedRequests<ApiCallWithResponse> => {
      const aggregatedApiCall = aggregatedApiCallsById[apiCall.id];
      // There should always be a matching AggregatedApiCall. Something has gone wrong if there isn't
      if (!aggregatedApiCall) {
        const log = logger.pend('ERROR', `Unable to find matching aggregated API calls for Request:${apiCall.id}`);
        return { ...acc, logs: [...acc.logs, log] };
      }

      // Add the error to the ApiCall
      if (!aggregatedApiCall.success) {
        return {
          ...acc,
          requests: [
            ...acc.requests,
            { ...apiCall, errorMessage: aggregatedApiCall.errorMessage, success: aggregatedApiCall.success },
          ],
        };
      }

      return {
        ...acc,
        requests: [
          ...acc.requests,
          {
            ...apiCall,
            data: aggregatedApiCall.data,
            success: true,
            reservedParameterOverrides: aggregatedApiCall.reservedParameterOverrides,
          },
        ],
      };
    },
    { logs: [], requests: [] } as UpdatedRequests<ApiCallWithResponse>
  );

  return [logs, requests];
}

function mapEVMProviderState(
  state: ProviderState<EVMProviderState>,
  aggregatedApiCallsById: RegularAggregatedApiCallsWithResponseById
): LogsData<ProviderState<EVMProviderState>> {
  const [logs, apiCalls] = updateApiCallResponses(state.requests.apiCalls, aggregatedApiCallsById);
  const requests = { ...state.requests, apiCalls };

  return [logs, { ...state, requests }];
}

export function disaggregate(state: CoordinatorStateWithApiResponses): LogsData<ProviderState<EVMProviderState>[]> {
  const logsWithProviderStates = state.providerStates.evm.map((evmProvider) => {
    return mapEVMProviderState(evmProvider, state.aggregatedApiCallsById);
  });

  const logs = flatMap(logsWithProviderStates, (ps) => ps[0]);
  const providerStates = flatMap(logsWithProviderStates, (w) => w[1]);

  return [logs, providerStates];
}
