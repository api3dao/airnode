import { ethers } from 'ethers';
import chunk from 'lodash/chunk';
import flatten from 'lodash/flatten';
import { goTimeout } from '../../utils/promise-utils';
import * as logger from '../../utils/logger';
import { Convenience } from '../../ethereum/contracts';
import {
  ApiCallParameters,
  ApiCallRequest,
  ApiCallTemplate,
  ApiRequestErrorCode,
  ProviderState,
} from '../../../types';
import * as parameters from './parameters';

const TIMEOUT = 5_000;

async function fetchTemplateGroup(state: ProviderState, templateIds: string[]): Promise<ApiCallTemplate[] | null> {
  const { config, provider } = state;
  const contract = new ethers.Contract(Convenience.addresses[config.chainId], Convenience.ABI, provider);
  const contractCall = contract.getTemplates(templateIds) as Promise<ApiCallTemplate[]>;
  const [err, templates] = await goTimeout(TIMEOUT, contractCall);
  // If we fail to fetch templates, the linked requests will be discarded and retried
  // on the next run
  if (err || !templates) {
    logger.logProviderError(config.name, 'Failed to fetch API call templates', err);
    return [];
  }
  return templates;
}

function mapApiCallTemplates(rawTemplates: any, templateIds: string[]): ApiCallTemplate[] {
  return templateIds.map((templateId, index) => {
    // Templates are always returned in the same order that they
    // are called with
    return {
      templateId,
      endpointId: rawTemplates.endpointIds[index],
      providerId: rawTemplates.providerIds[index],
      fulfillAddress: rawTemplates.fulfillAddresses[index],
      fulfillFunctionId: rawTemplates.fulfillFunctionIds[index],
      errorAddress: rawTemplates.errorAddresses[index],
      errorFunctionId: rawTemplates.errorFunctionIds[index],
      encodedParameters: rawTemplates.parameters[index],
    };
  });
}

export async function fetch(state: ProviderState, apiCallRequests: ApiCallRequest[]) {
  const templateIds = apiCallRequests.map((r) => r.templateId).filter((t) => !!t) as string[];

  // Requests are made for up to 10 templates at a time
  const groupedTemplateIds = chunk(templateIds, 10);

  // Fetch all groups of templates in parallel
  const promises = groupedTemplateIds.map(async (templateIds) => {
    const rawTemplates = await fetchTemplateGroup(state, templateIds);
    const templates = mapApiCallTemplates(rawTemplates, templateIds);
    return templates;
  });

  const templates = await Promise.all(promises);

  // The templates are still in a nested array at this point so we need to flatten once
  return flatten(templates);
}

function mergeRequestAndTemplate(
  request: ApiCallRequest,
  template: ApiCallTemplate,
  templateParameters: ApiCallParameters
): ApiCallRequest {
  return {
    ...request,
    endpointId: request.endpointId || template.endpointId,
    fulfillAddress: request.fulfillAddress || template.fulfillAddress,
    fulfillFunctionId: request.fulfillFunctionId || template.fulfillFunctionId,
    errorAddress: request.errorAddress || template.errorAddress,
    errorFunctionId: request.errorFunctionId || template.errorFunctionId,
    // NOTE: template parameters can be overwritten by the request
    parameters: { ...templateParameters, ...request.parameters },
  };
}

export function apply(
  state: ProviderState,
  requests: ApiCallRequest[],
  templates: ApiCallTemplate[]
): ApiCallRequest[] {
  return requests.reduce((acc, request) => {
    const { requestId, templateId } = request;

    // If the request does not have a template to apply, skip it
    if (!templateId) {
      return [...acc, request];
    }

    const template = templates.find((t) => t.templateId === templateId);
    // If no template is found, then we aren't able to build the full request.
    // Drop the request for now and it will be retried on the next run
    if (!template) {
      const message = `Unable to fetch template ID:${templateId} for Request ID:${requestId}. Request has been discarded until the next run.`;
      logger.logProviderJSON(state.config.name, 'WARN', message);
      return acc;
    }

    const templateParameters = parameters.tryDecodeParameters(template.encodedParameters);

    // If the template contains invalid parameters, then we can't use execute the request
    if (templateParameters === null) {
      const message = `Template ID:${requestId} contains invalid parameters: ${template.encodedParameters}`;
      logger.logProviderJSON(state.config.name, 'ERROR', message);
      const invalidatedRequest = { ...request, valid: false, errorCode: ApiRequestErrorCode.InvalidTemplateParameters };
      return [...acc, invalidatedRequest];
    }

    const requestWithTemplateParams = mergeRequestAndTemplate(request, template, templateParameters);

    return [...acc, requestWithTemplateParams];
  }, []);
}
