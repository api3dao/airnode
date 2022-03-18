import flatMap from 'lodash/flatMap';
import { logger } from '@api3/airnode-utilities';
import {
  AggregatedApiCallsById,
  ApiCall,
  Request,
  CoordinatorState,
  EVMProviderState,
  LogsData,
  ProviderState,
  RequestStatus,
  UpdatedRequests,
} from '../../types';

function updateApiCallResponses(
  apiCalls: Request<ApiCall>[],
  aggregatedApiCallsById: AggregatedApiCallsById
): LogsData<Request<ApiCall>[]> {
  const { logs, requests } = apiCalls.reduce(
    (acc, apiCall) => {
      if (apiCall.status !== RequestStatus.Pending) {
        const message = `Not applying response value to Request:${apiCall.id} as it has status:${apiCall.status}`;
        const log = logger.pend('DEBUG', message);
        return { ...acc, logs: [...acc.logs, log], requests: [...acc.requests, apiCall] };
      }

      const aggregatedApiCall = aggregatedApiCallsById[apiCall.id];
      // There should always be a matching AggregatedApiCall. Something has gone wrong if there isn't
      if (!aggregatedApiCall) {
        const log = logger.pend('ERROR', `Unable to find matching aggregated API calls for Request:${apiCall.id}`);
        return { ...acc, logs: [...acc.logs, log] };
      }

      // Add the error to the ApiCall
      if (aggregatedApiCall.errorMessage) {
        return { ...acc, requests: [...acc.requests, { ...apiCall, errorMessage: aggregatedApiCall.errorMessage }] };
      }

      return {
        ...acc,
        requests: [
          ...acc.requests,
          { ...apiCall, responseValue: aggregatedApiCall.responseValue, signature: aggregatedApiCall.signature },
        ],
      };
    },
    { logs: [], requests: [] } as UpdatedRequests<ApiCall>
  );
  return [logs, requests];
}

function mapEVMProviderState(
  state: ProviderState<EVMProviderState>,
  aggregatedApiCallsById: AggregatedApiCallsById
): LogsData<ProviderState<EVMProviderState>> {
  const [logs, apiCalls] = updateApiCallResponses(state.requests.apiCalls, aggregatedApiCallsById);
  const requests = { ...state.requests, apiCalls };

  return [logs, { ...state, requests }];
}

export function disaggregate(state: CoordinatorState): LogsData<ProviderState<EVMProviderState>[]> {
  const logsWithProviderStates = state.providerStates.evm.map((evmProvider) => {
    return mapEVMProviderState(evmProvider, state.aggregatedApiCallsById);
  });

  const logs = flatMap(logsWithProviderStates, (ps) => ps[0]);
  const providerStates = flatMap(logsWithProviderStates, (w) => w[1]);

  return [logs, providerStates];
}
