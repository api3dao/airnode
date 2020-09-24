import flatMap from 'lodash/flatMap';
import * as logger from '../../logger';
import * as ethereum from '../../ethereum';
import {
  ApiCall,
  ApiCallParameters,
  ApiCallTemplate,
  ClientRequest,
  LogsErrorData,
  PendingLog,
  RequestErrorCode,
  RequestStatus,
  WalletDataByIndex,
} from '../../../types';

interface ApiCallTemplatesById {
  [id: string]: ApiCallTemplate;
}

interface LogsWithWalletData {
  logs: PendingLog[];
  walletDataByIndex: WalletDataByIndex;
}

function mergeRequestAndTemplate(
  request: ClientRequest<ApiCall>,
  template: ApiCallTemplate,
  templateParameters: ApiCallParameters
): ClientRequest<ApiCall> {
  return {
    ...request,
    // NOTE: template attributes can be overwritten by the request attributes
    endpointId: request.endpointId || template.endpointId,
    fulfillAddress: request.fulfillAddress || template.fulfillAddress,
    fulfillFunctionId: request.fulfillFunctionId || template.fulfillFunctionId,
    errorAddress: request.errorAddress || template.errorAddress,
    errorFunctionId: request.errorFunctionId || template.errorFunctionId,
    // NOTE: the spread operator is case sensitive, meaning that you can
    // have 2 (or more) parameters with the same value, but different cases.
    // All parameters would then get included. i.e.
    //   request: { from: 'ETH' }
    //   template: { From: 'USDC' }
    //
    //   result: { From: 'USDC', from: 'ETH }
    parameters: { ...templateParameters, ...request.parameters },
  };
}

function mapApiCalls(
  apiCalls: ClientRequest<ApiCall>[],
  templatesById: ApiCallTemplatesById
): LogsErrorData<ClientRequest<ApiCall>[]> {
  const logsWithApiCalls: LogsErrorData<ClientRequest<ApiCall>>[] = apiCalls.map((apiCall) => {
    const { id, templateId } = apiCall;

    // If the request does not have a template to apply, skip it
    if (!templateId) {
      return [[], null, apiCall];
    }

    const template = templatesById[templateId];
    // If no template is found, then we aren't able to build the full request.
    // Block the request for now and it will be retried on the next run
    if (!template) {
      const log = logger.pend('ERROR', `Unable to fetch template ID:${templateId} for Request ID:${id}`);
      const updatedApiCall = {
        ...apiCall,
        status: RequestStatus.Blocked,
        errorCode: RequestErrorCode.TemplateNotFound,
      };
      return [[log], null, updatedApiCall];
    }

    // Attempt to decode the template parameters
    const templateParameters = ethereum.cbor.safeDecode(template.encodedParameters);

    // If the template contains invalid parameters, then we can't use execute the request
    if (templateParameters === null) {
      const log = logger.pend('ERROR', `Template ID:${id} contains invalid parameters: ${template.encodedParameters}`);
      const updatedApiCall = {
        ...apiCall,
        status: RequestStatus.Errored,
        errorCode: RequestErrorCode.InvalidTemplateParameters,
      };
      return [[log], null, updatedApiCall];
    }

    const updatedApiCall = mergeRequestAndTemplate(apiCall, template, templateParameters);

    return [[], null, updatedApiCall];
  });

  const logs = flatMap(logsWithApiCalls, (a) => a[0]);
  const updatedApiCalls = flatMap(logsWithApiCalls, (a) => a[2]);

  return [logs, null, updatedApiCalls];
}

export function mergeApiCallsWithTemplates(
  walletDataByIndex: WalletDataByIndex,
  templatesById: ApiCallTemplatesById
): LogsErrorData<WalletDataByIndex> {
  const walletIndices = Object.keys(walletDataByIndex);

  const updatedWalletDataWithLogs: LogsWithWalletData = walletIndices.reduce(
    (acc, index) => {
      const walletData = walletDataByIndex[index];
      const { requests } = walletData;

      // Update each API call if it is linked to a template
      const [mapApiCallLogs, _mapApiCallErr, apiCalls] = mapApiCalls(requests.apiCalls, templatesById);

      const updatedLogs = [...acc.logs, ...mapApiCallLogs];

      const updatedWalletData = { ...walletData, requests: { ...requests, apiCalls } };
      const updatedWalletDataByIndex = {
        ...acc.walletDataByIndex,
        [index]: updatedWalletData,
      };

      return { logs: updatedLogs, walletDataByIndex: updatedWalletDataByIndex };
    },
    { logs: [], walletDataByIndex: {} }
  );

  return [updatedWalletDataWithLogs.logs, null, updatedWalletDataWithLogs.walletDataByIndex];
}
