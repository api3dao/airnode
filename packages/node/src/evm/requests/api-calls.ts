import flatMap from 'lodash/flatMap';
import * as events from './events';
import * as encoding from '../abi-encoding';
import { airnodeRrpTopics } from '../contracts';
import * as logger from '../../logger';
import {
  ApiCall,
  ApiCallType,
  Request,
  EVMEventLog,
  EVMMadeRequestLog,
  EVMFulfilledRequestLog,
  LogsData,
  PendingLog,
  RequestErrorMessage,
  RequestStatus,
} from '../../types';

function getApiCallType(topic: string): ApiCallType {
  switch (topic) {
    case airnodeRrpTopics.MadeTemplateRequest:
      return 'template';
    case airnodeRrpTopics.MadeFullRequest:
      return 'full';
    // This should never be reached
    default:
      throw new Error(`Unknown topic:${topic} during API call initialization`);
  }
}

export function initialize(log: EVMMadeRequestLog): Request<ApiCall> {
  const { parsedLog } = log;

  const request: Request<ApiCall> = {
    airnodeAddress: parsedLog.args.airnode,
    chainId: parsedLog.args.chainId.toString(),
    requesterAddress: parsedLog.args.requester,
    sponsorWalletAddress: parsedLog.args.sponsorWallet,
    encodedParameters: parsedLog.args.parameters,
    id: parsedLog.args.requestId,
    endpointId: events.isFullApiRequest(log) ? log.parsedLog.args.endpointId : null,
    fulfillAddress: parsedLog.args.fulfillAddress,
    fulfillFunctionId: parsedLog.args.fulfillFunctionId,
    metadata: {
      address: log.address,
      blockNumber: log.blockNumber,
      currentBlock: log.currentBlock,
      ignoreBlockedRequestsAfterBlocks: log.ignoreBlockedRequestsAfterBlocks,
      transactionHash: log.transactionHash,
    },
    // Parameters are decoded separately
    parameters: {},
    requestCount: parsedLog.args.requesterRequestCount.toString(),
    sponsorAddress: parsedLog.args.sponsor,
    status: RequestStatus.Pending,
    templateId: events.isTemplateApiRequest(log) ? log.parsedLog.args.templateId : null,
    type: getApiCallType(parsedLog.topic),
  };

  return request;
}

export function applyParameters(request: Request<ApiCall>): LogsData<Request<ApiCall>> {
  if (!request.encodedParameters) {
    return [[], request];
  }

  const parameters = encoding.safeDecode(request.encodedParameters);
  if (parameters === null) {
    const { id, encodedParameters } = request;

    const log = logger.pend('ERROR', `Request ID:${id} submitted with invalid parameters: ${encodedParameters}`);

    const updatedRequest: Request<ApiCall> = {
      ...request,
      status: RequestStatus.Errored,
      errorMessage: `${RequestErrorMessage.RequestParameterDecodingFailed}: ${encodedParameters}`,
    };

    return [[log], updatedRequest];
  }

  return [[], { ...request, parameters }];
}

export interface UpdatedFulfilledRequests {
  readonly logs: PendingLog[];
  readonly requests: Request<ApiCall>[];
}

export function updateFulfilledRequests(
  apiCalls: Request<ApiCall>[],
  fulfilledRequestIds: string[]
): LogsData<Request<ApiCall>[]> {
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

export function mapRequests(logsWithMetadata: EVMEventLog[]): LogsData<Request<ApiCall>[]> {
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
