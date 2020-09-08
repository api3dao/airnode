import flatMap from 'lodash/flatMap';
import isEqual from 'lodash/isEqual';
import pick from 'lodash/pick';
import * as ethereum from 'src/core/ethereum';
import {
  AggregatedApiCall,
  ApiCall,
  BaseRequest,
  ClientRequest,
  LogWithMetadata,
  PendingLog,
  ProviderState,
  RequestErrorCode,
  RequestStatus,
} from 'src/types';

type LogsAndRequests = [PendingLog[], BaseRequest<ApiCall>[]];

export function initialize(logWithMetadata: LogWithMetadata): BaseRequest<ApiCall> {
  const { parsedLog } = logWithMetadata;

  const request: BaseRequest<ApiCall> = {
    id: parsedLog.args.requestId,
    status: RequestStatus.Pending,
    requesterAddress: parsedLog.args.requester,
    providerId: parsedLog.args.providerId,
    endpointId: parsedLog.args.endpointId || null,
    templateId: parsedLog.args.templateId || null,
    fulfillAddress: parsedLog.args.fulfillAddress,
    fulfillFunctionId: parsedLog.args.fulfillFunctionId,
    errorAddress: parsedLog.args.errorAddress,
    errorFunctionId: parsedLog.args.errorFunctionId,
    encodedParameters: parsedLog.args.parameters,
    // Parameters are decoded separately
    parameters: {},
    logMetadata: {
      blockNumber: logWithMetadata.blockNumber,
      transactionHash: logWithMetadata.transactionHash,
    },
  };

  return request;
}

export function applyParameters(request: BaseRequest<ApiCall>): [PendingLog[], BaseRequest<ApiCall>] {
  if (!request.encodedParameters) {
    return [[], request];
  }

  const parameters = ethereum.cbor.safeDecode(request.encodedParameters);
  if (parameters === null) {
    const { id, encodedParameters } = request;

    const log: PendingLog = {
      level: 'ERROR',
      message: `Request ID:${id} submitted with invalid parameters: ${encodedParameters}`,
    };

    const updatedRequest = {
      ...request,
      status: RequestStatus.Errored,
      errorCode: RequestErrorCode.InvalidRequestParameters,
    };

    return [[log], updatedRequest];
  }

  return [[], { ...request, parameters }];
}

export function updateFulfilledRequests(
  apiCalls: BaseRequest<ApiCall>[],
  fulfilledRequestIds: string[]
): LogsAndRequests {
  const initialState = {
    logs: [],
    requests: [],
  };

  const fulfilledApiCalls = apiCalls.reduce((acc, apiCall) => {
    if (fulfilledRequestIds.includes(apiCall.id)) {
      const log: PendingLog = {
        level: 'DEBUG',
        message: `Request ID:${apiCall.id} has already been fulfilled`,
      };

      const fulfilledApiCall = { ...apiCall, status: RequestStatus.Fulfilled };

      return {
        ...acc,
        logs: [...acc.logs, log],
        requests: [...acc.requests, fulfilledApiCall],
      };
    }

    return acc;
  }, initialState);

  return [fulfilledApiCalls.logs, fulfilledApiCalls.requests];
}

export function isDuplicate(apiCall: ClientRequest<ApiCall>, aggregatedApiCall: AggregatedApiCall): boolean {
  const fields = ['id', 'endpointId', 'parameters'];
  return isEqual(pick(apiCall, fields), pick(aggregatedApiCall, fields));
}

export function flatten(state: ProviderState): ClientRequest<ApiCall>[] {
  const walletIndices = Object.keys(state.walletDataByIndex);

  return flatMap(walletIndices, (index) => {
    return state.walletDataByIndex[index].requests.apiCalls;
  });
}
