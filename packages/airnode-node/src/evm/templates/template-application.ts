import { logger } from '@api3/airnode-utilities';
import * as evm from '..';
import {
  ApiCall,
  ApiCallParameters,
  ApiCallTemplate,
  Request,
  LogsData,
  ApiCallTemplatesById,
  UpdatedRequests,
} from '../../types';

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
    template,
  };
}

// TODO: This could also be done in call-api
function updateApiCallsWithTemplate(
  apiCalls: Request<ApiCall>[],
  templatesById: ApiCallTemplatesById
): LogsData<Request<ApiCall>[]> {
  const { logs, requests } = apiCalls.reduce(
    (acc, apiCall) => {
      const { id, templateId } = apiCall;

      // If the request does not have a template to apply, skip it
      if (!templateId) {
        const log = logger.pend('DEBUG', `Request:${id} is not linked to a template`);
        return { ...acc, logs: [...acc.logs, log], requests: [...acc.requests, apiCall] };
      }

      const template = templatesById[templateId];
      // Drop the request if no template is found
      if (!template) {
        const log = logger.pend('ERROR', `Unable to fetch template ID:${templateId} for Request ID:${id}`);
        return { ...acc, logs: [...acc.logs, log] };
      }

      // Attempt to decode the template parameters
      const templateParameters = evm.encoding.safeDecode(template.encodedParameters);

      // Drop the request if the template contains invalid parameters
      if (templateParameters === null) {
        const log = logger.pend(
          'ERROR',
          `Template ID:${template.id} contains invalid parameters: ${template.encodedParameters}`
        );
        return { ...acc, logs: [...acc.logs, log] };
      }

      const updatedApiCall = applyTemplate(apiCall, template, templateParameters);
      const log = logger.pend('DEBUG', `Template ID:${template.id} applied to Request:${apiCall.id}`);
      return { ...acc, logs: [...acc.logs, log], requests: [...acc.requests, updatedApiCall] };
    },
    { logs: [], requests: [] } as UpdatedRequests<ApiCall>
  );
  return [logs, requests];
}

export function mergeApiCallsWithTemplates(
  apiCalls: Request<ApiCall>[],
  templatesById: ApiCallTemplatesById
): LogsData<Request<ApiCall>[]> {
  const [logs, templatedApiCalls] = updateApiCallsWithTemplate(apiCalls, templatesById);

  return [logs, templatedApiCalls];
}
