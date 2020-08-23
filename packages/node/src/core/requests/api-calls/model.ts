import isEqual from 'lodash/isEqual';
import pick from 'lodash/pick';
import * as ethereum from '../../ethereum';
import * as logger from '../../utils/logger';
import {
  AggregatedApiCall,
  ApiCall,
  BaseRequest,
  ClientRequest,
  LogWithMetadata,
  ProviderState,
  RequestErrorCode,
  RequestStatus,
} from '../../../types';

function applyParameters(state: ProviderState, request: BaseRequest<ApiCall>): BaseRequest<ApiCall> {
  if (!request.encodedParameters) {
    return request;
  }

  const parameters = ethereum.cbor.safeDecode(request.encodedParameters);
  if (parameters === null) {
    const { id, encodedParameters } = request;
    const message = `Request ID:${id} submitted with invalid parameters: ${encodedParameters}`;
    logger.logProviderJSON(state.config.name, 'ERROR', message);
    return { ...request, status: RequestStatus.Errored, errorCode: RequestErrorCode.InvalidRequestParameters };
  }

  return { ...request, parameters };
}

export function initialize(state: ProviderState, logWithMetadata: LogWithMetadata): BaseRequest<ApiCall> {
  const { parsedLog } = logWithMetadata;

  const request: BaseRequest<ApiCall> = {
    id: parsedLog.args.requestId,
    status: RequestStatus.Pending,
    blockNumber: logWithMetadata.blockNumber,
    transactionHash: logWithMetadata.transactionHash,
    requesterAddress: parsedLog.args.requester,
    providerId: parsedLog.args.providerId,
    endpointId: parsedLog.args.endpointId || null,
    templateId: parsedLog.args.templateId || null,
    fulfillAddress: parsedLog.args.fulfillAddress,
    fulfillFunctionId: parsedLog.args.fulfillFunctionId,
    errorAddress: parsedLog.args.errorAddress,
    errorFunctionId: parsedLog.args.errorFunctionId,
    encodedParameters: parsedLog.args.parameters,
    parameters: {},
  };

  const withParameters = applyParameters(state, request);
  return withParameters;
}

export function isDuplicate(apiCall: ClientRequest<ApiCall>, aggregatedApiCall: AggregatedApiCall): boolean {
  const fields = ['id', 'endpointId', 'parameters'];
  return isEqual(pick(apiCall, fields), pick(aggregatedApiCall, fields));
}
