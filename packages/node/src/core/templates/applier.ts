import * as logger from '../utils/logger';
import * as ethereum from '../ethereum';
import {
  ApiCall,
  ApiCallParameters,
  ApiCallTemplate,
  ClientRequest,
  ProviderState,
  RequestErrorCode,
} from '../../types';

function mergeRequestAndTemplate(
  request: ClientRequest<ApiCall>,
  template: ApiCallTemplate,
  templateParameters: ApiCallParameters
): ClientRequest<ApiCall> {
  return {
    ...request,
    // NOTE: template attributes can be overwritten by the request attributes
    endpointId: template.endpointId || request.endpointId,
    fulfillAddress: template.fulfillAddress || request.fulfillAddress,
    fulfillFunctionId: template.fulfillFunctionId || request.fulfillFunctionId,
    errorAddress: template.errorAddress || request.errorAddress,
    errorFunctionId: template.errorFunctionId || request.errorFunctionId,
    parameters: { ...templateParameters, ...request.parameters },
  };
}

export function mapApiCallsWithTemplates(state: ProviderState, templates: ApiCallTemplate[]): ClientRequest<ApiCall>[] {
  return state.requests.apiCalls.reduce((acc, apiCall) => {
    const { id, templateId } = apiCall;

    // If the request does not have a template to apply, skip it
    if (!templateId) {
      return [...acc, apiCall];
    }

    const template = templates.find((t) => t.templateId === templateId);
    // If no template is found, then we aren't able to build the full request.
    // Drop the request for now and it will be retried on the next run
    if (!template) {
      const message = `Unable to fetch template ID:${templateId} for Request ID:${id}. Request has been discarded.`;
      logger.logProviderJSON(state.config.name, 'ERROR', message);
      return acc;
    }

    const templateParameters = ethereum.cbor.safeDecode(template.encodedParameters);

    // If the template contains invalid parameters, then we can't use execute the request
    if (templateParameters === null) {
      const message = `Template ID:${id} contains invalid parameters: ${template.encodedParameters}`;
      logger.logProviderJSON(state.config.name, 'ERROR', message);
      const invalidatedApiCall = { ...apiCall, valid: false, errorCode: RequestErrorCode.InvalidTemplateParameters };
      return [...acc, invalidatedApiCall];
    }

    const updatedApiCall = mergeRequestAndTemplate(apiCall, template, templateParameters);

    return [...acc, updatedApiCall];
  }, []);
}
