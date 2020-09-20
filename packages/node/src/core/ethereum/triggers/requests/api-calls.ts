import flatMap from 'lodash/flatMap';
import * as cbor from '../../cbor';
import * as events from './events';
import * as logger from '../../../utils/logger';
import { ApiCall, BaseRequest, LogsData, LogWithMetadata, RequestErrorCode, RequestStatus } from '../../../../types';

interface InitialMetadata {
  providerIndex: number;
}

export function initialize(logWithMetadata: LogWithMetadata, metadata: InitialMetadata): BaseRequest<ApiCall> {
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
    metadata: {
      ...metadata,
      blockNumber: logWithMetadata.blockNumber,
      transactionHash: logWithMetadata.transactionHash,
    },
  };

  return request;
}

export function applyParameters(request: BaseRequest<ApiCall>): LogsData<BaseRequest<ApiCall>> {
  if (!request.encodedParameters) {
    return [[], request];
  }

  const parameters = cbor.safeDecode(request.encodedParameters);
  if (parameters === null) {
    const { id, encodedParameters } = request;

    const log = logger.pend('ERROR', `Request ID:${id} submitted with invalid parameters: ${encodedParameters}`);

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
): LogsData<BaseRequest<ApiCall>[]> {
  const { logs, requests } = apiCalls.reduce(
    (acc, apiCall) => {
      if (fulfilledRequestIds.includes(apiCall.id)) {
        const log = logger.pend('DEBUG', `Request ID:${apiCall.id} has already been fulfilled`);

        const fulfilledApiCall = { ...apiCall, status: RequestStatus.Fulfilled };

        return {
          ...acc,
          logs: [...acc.logs, log],
          requests: [...acc.requests, fulfilledApiCall],
        };
      }

      return { ...acc, requests: [...acc.requests, apiCall] };
    },
    { logs: [], requests: [] }
  );

  return [logs, requests];
}

export function mapBaseRequests(
  logsWithMetadata: LogWithMetadata[],
  providerIndex: number
): LogsData<BaseRequest<ApiCall>[]> {
  // Separate the logs
  const requestLogs = logsWithMetadata.filter((log) => events.isApiCallRequest(log.parsedLog));
  const fulfillmentLogs = logsWithMetadata.filter((log) => events.isApiCallFulfillment(log.parsedLog));

  // Cast raw logs to typed API request objects
  const apiCallBaseRequests = requestLogs.map((log) => initialize(log, { providerIndex }));

  // Decode and apply parameters for each API call
  const parameterized = apiCallBaseRequests.map((request) => applyParameters(request));
  const parameterLogs = flatMap(parameterized, (p) => p[0]);
  const parameterizedRequests = flatMap(parameterized, (p) => p[1]);

  // Update the status of requests that have already been fulfilled
  const fulfilledRequestIds = fulfillmentLogs.map((fl) => fl.parsedLog.args.requestId);
  const [fulfilledLogs, fulfilledRequests] = updateFulfilledRequests(parameterizedRequests, fulfilledRequestIds);

  const logs = [...parameterLogs, ...fulfilledLogs];
  return [logs, fulfilledRequests];
}
