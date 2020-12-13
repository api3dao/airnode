import flatMap from 'lodash/flatMap';
import * as encoding from '../abi-encoding';
import * as contracts from '../contracts';
import * as events from './events';
import * as logger from '../../logger';
import {
  ApiCall,
  ApiCallType,
  ClientRequest,
  EVMEventLogWithMetadata,
  LogsData,
  RequestErrorCode,
  RequestStatus,
} from '../../types';

function getApiCallType(topic: string): ApiCallType {
  const { topics } = contracts.Airnode;
  switch (topic) {
    case topics.ClientRequestCreated:
      return 'regular';
    case topics.ClientShortRequestCreated:
      return 'short';
    case topics.ClientFullRequestCreated:
      return 'full';
    // This should never be reached
    default:
      throw new Error(`Unknown topic:${topic} during API call initialization`);
  }
}

export function initialize(logWithMetadata: EVMEventLogWithMetadata): ClientRequest<ApiCall> {
  const { parsedLog } = logWithMetadata;

  const request: ClientRequest<ApiCall> = {
    clientAddress: parsedLog.args.clientAddress,
    designatedWallet: parsedLog.args.designatedWallet || null,
    encodedParameters: parsedLog.args.parameters,
    id: parsedLog.args.requestId,
    endpointId: parsedLog.args.endpointId || null,
    fulfillAddress: parsedLog.args.fulfillAddress,
    fulfillFunctionId: parsedLog.args.fulfillFunctionId,
    metadata: {
      blockNumber: logWithMetadata.blockNumber,
      currentBlock: logWithMetadata.currentBlock,
      ignoreBlockedRequestsAfterBlocks: logWithMetadata.ignoreBlockedRequestsAfterBlocks,
      transactionHash: logWithMetadata.transactionHash,
    },
    // Parameters are decoded separately
    parameters: {},
    providerId: parsedLog.args.providerId,
    requestCount: parsedLog.args.noRequests.toString(),
    requesterIndex: parsedLog.args.requesterIndex?.toString() || null,
    status: RequestStatus.Pending,
    templateId: parsedLog.args.templateId || null,
    type: getApiCallType(parsedLog.topic),
  };

  return request;
}

export function applyParameters(request: ClientRequest<ApiCall>): LogsData<ClientRequest<ApiCall>> {
  if (!request.encodedParameters) {
    return [[], request];
  }

  const parameters = encoding.safeDecode(request.encodedParameters);
  if (parameters === null) {
    const { id, encodedParameters } = request;

    const log = logger.pend('ERROR', `Request ID:${id} submitted with invalid parameters: ${encodedParameters}`);

    const updatedRequest = {
      ...request,
      status: RequestStatus.Errored,
      errorCode: RequestErrorCode.RequestParameterDecodingFailed,
    };

    return [[log], updatedRequest];
  }

  return [[], { ...request, parameters }];
}

export function updateFulfilledRequests(
  apiCalls: ClientRequest<ApiCall>[],
  fulfilledRequestIds: string[]
): LogsData<ClientRequest<ApiCall>[]> {
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

export function mapRequests(logsWithMetadata: EVMEventLogWithMetadata[]): LogsData<ClientRequest<ApiCall>[]> {
  // Separate the logs
  const requestLogs = logsWithMetadata.filter((log) => events.isApiCallRequest(log.parsedLog));
  const fulfillmentLogs = logsWithMetadata.filter((log) => events.isApiCallFulfillment(log.parsedLog));

  // Cast raw logs to typed API request objects
  const apiCallRequests = requestLogs.map((log) => initialize(log));

  // Decode and apply parameters for each API call
  const parameterized = apiCallRequests.map((request) => applyParameters(request));
  const parameterLogs = flatMap(parameterized, (p) => p[0]);
  const parameterizedRequests = flatMap(parameterized, (p) => p[1]);

  // Update the status of requests that have already been fulfilled
  const fulfilledRequestIds = fulfillmentLogs.map((fl) => fl.parsedLog.args.requestId);
  const [fulfilledLogs, fulfilledRequests] = updateFulfilledRequests(parameterizedRequests, fulfilledRequestIds);

  const logs = [...parameterLogs, ...fulfilledLogs];
  return [logs, fulfilledRequests];
}
