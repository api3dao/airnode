import flatMap from 'lodash/flatMap';
import * as logger from '../../logger';
import * as evm from '..';
import {
  ApiCall,
  ApiCallParameters,
  ApiCallTemplate,
  Request,
  LogsData,
  RequestErrorCode,
  RequestStatus,
} from '../../types';

interface ApiCallTemplatesById {
  readonly [id: string]: ApiCallTemplate;
}

function applyTemplate(
  request: Request<ApiCall>,
  template: ApiCallTemplate,
  templateParameters: ApiCallParameters
): Request<ApiCall> {
  return {
    ...request,
    // airnodeAddress and endpointId will either be request or a template attribute
    airnodeAddress: request.airnodeAddress || template.airnodeAddress,
    endpointId: request.endpointId || template.endpointId,
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

function updateApiCallWithTemplate(
  apiCall: Request<ApiCall>,
  templatesById: ApiCallTemplatesById
): LogsData<Request<ApiCall>> {
  const { id, status, templateId } = apiCall;

  // If the request does not have a template to apply, skip it
  if (!templateId) {
    const log = logger.pend('DEBUG', `Request:${id} is not linked to a template`);
    return [[log], apiCall];
  }

  if (apiCall.status !== RequestStatus.Pending) {
    const log = logger.pend('DEBUG', `Skipping template application for Request:${id} as it has status code:${status}`);
    return [[log], apiCall];
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
    return [[log], updatedApiCall];
  }

  // Attempt to decode the template parameters
  const templateParameters = evm.encoding.safeDecode(template.encodedParameters);

  // If the template contains invalid parameters, then we can't use it to execute the request
  if (templateParameters === null) {
    const log = logger.pend(
      'ERROR',
      `Template ID:${template.id} contains invalid parameters: ${template.encodedParameters}`
    );
    const updatedApiCall = {
      ...apiCall,
      status: RequestStatus.Errored,
      errorCode: RequestErrorCode.TemplateParameterDecodingFailed,
    };
    return [[log], updatedApiCall];
  }

  const updatedApiCall = applyTemplate(apiCall, template, templateParameters);
  const log = logger.pend('DEBUG', `Template ID:${template.id} applied to Request:${apiCall.id}`);
  return [[log], updatedApiCall];
}

export function mergeApiCallsWithTemplates(
  apiCalls: Request<ApiCall>[],
  templatesById: ApiCallTemplatesById
): LogsData<Request<ApiCall>[]> {
  const logsWithApiCalls = apiCalls.map((apiCall) => {
    return updateApiCallWithTemplate(apiCall, templatesById);
  });

  const logs = flatMap(logsWithApiCalls, (a) => a[0]);
  const templatedApiCalls = flatMap(logsWithApiCalls, (a) => a[1]);
  return [logs, templatedApiCalls];
}
