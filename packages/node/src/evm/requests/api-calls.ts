import flatMap from 'lodash/flatMap';
import * as events from './events';
import * as encoding from '../abi-encoding';
import { airnodeRrpTopics } from '../contracts';
import * as logger from '../../logger';
import {
  ApiCall,
  ApiCallType,
  ClientRequest,
  EVMEventLog,
  EVMMadeRequestLog,
  EVMFulfilledRequestLog,
  LogsData,
  PendingLog,
  RequestErrorCode,
  RequestStatus,
} from '../../types';

function getApiCallType(topic: string): ApiCallType {
  switch (topic) {
    case airnodeRrpTopics.MadeTemplateRequest:
      return 'regular';
    case airnodeRrpTopics.MadeFullRequest:
      return 'full';
    // This should never be reached
    default:
      throw new Error(`Unknown topic:${topic} during API call initialization`);
  }
}

export function initialize(log: EVMMadeRequestLog): ClientRequest<ApiCall> {
  const { parsedLog } = log;

  const request: ClientRequest<ApiCall> = {
    airnodeId: parsedLog.args.airnodeId,
    chainId: parsedLog.args.chainId.toString(),
    clientAddress: parsedLog.args.clientAddress,
    designatedWallet: parsedLog.args.designatedWallet,
    encodedParameters: parsedLog.args.parameters,
    id: parsedLog.args.requestId,
    endpointId: events.isFullApiRequest(log) ? log.parsedLog.args.endpointId : null,
    fulfillAddress: parsedLog.args.fulfillAddress,
    fulfillFunctionId: parsedLog.args.fulfillFunctionId,
    metadata: {
      blockNumber: log.blockNumber,
      currentBlock: log.currentBlock,
      ignoreBlockedRequestsAfterBlocks: log.ignoreBlockedRequestsAfterBlocks,
      transactionHash: log.transactionHash,
    },
    // Parameters are decoded separately
    parameters: {},
    requestCount: parsedLog.args.noRequests.toString(),
    requesterIndex: parsedLog.args.requesterIndex?.toString(),
    status: RequestStatus.Pending,
    templateId: events.isTemplateApiRequest(log) ? log.parsedLog.args.templateId : null,
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

export interface UpdatedFulfilledRequests {
  readonly logs: PendingLog[];
  readonly requests: ClientRequest<ApiCall>[];
}

export function updateFulfilledRequests(
  apiCalls: ClientRequest<ApiCall>[],
  fulfilledRequestIds: string[]
): LogsData<ClientRequest<ApiCall>[]> {
  const { logs, requests } = apiCalls.reduce(
    (acc, apiCall) => {
      if (fulfilledRequestIds.includes(apiCall.id)) {
        const log = logger.pend('DEBUG', `Request ID:${apiCall.id} (API call) has already been fulfilled`);

        const fulfilledApiCall = { ...apiCall, status: RequestStatus.Fulfilled };

        return {
          ...acc,
          logs: [...acc.logs, log],
          requests: [...acc.requests, fulfilledApiCall],
        };
      }

      return { ...acc, requests: [...acc.requests, apiCall] };
    },
    { logs: [], requests: [] } as UpdatedFulfilledRequests
  );

  return [logs, requests];
}

export function mapRequests(logsWithMetadata: EVMEventLog[]): LogsData<ClientRequest<ApiCall>[]> {
  // Separate the logs
  const requestLogs = logsWithMetadata.filter((log) => events.isApiCallRequest(log)) as EVMMadeRequestLog[];
  const fulfillmentLogs = logsWithMetadata.filter((log) =>
    events.isApiCallFulfillment(log)
  ) as EVMFulfilledRequestLog[];

  // Cast raw logs to typed API request objects
  const apiCallRequests = requestLogs.map(initialize);

  // Decode and apply parameters for each API call
  const parameterized = apiCallRequests.map(applyParameters);
  const parameterLogs = flatMap(parameterized, (p) => p[0]);
  const parameterizedRequests = flatMap(parameterized, (p) => p[1]);

  // Update the status of requests that have already been fulfilled
  const fulfilledRequestIds = fulfillmentLogs.map((fl) => fl.parsedLog.args.requestId);
  const [fulfilledLogs, apiCallsWithFulfillments] = updateFulfilledRequests(parameterizedRequests, fulfilledRequestIds);

  const logs = [...parameterLogs, ...fulfilledLogs];
  return [logs, apiCallsWithFulfillments];
}
