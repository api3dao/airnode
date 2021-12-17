import { ethers } from 'ethers';
import flatMap from 'lodash/flatMap';
import * as logger from '../../logger';
import { ApiCall, ApiCallTemplate, Request, LogsData, RequestErrorMessage, RequestStatus } from '../../types';

interface ValidatedField {
  readonly type: string;
  readonly value: any;
}

function getTemplateIdValidationFields(template: ApiCallTemplate): ValidatedField[] {
  return [
    { type: 'address', value: template.airnodeAddress },
    { type: 'bytes32', value: template.endpointId },
    { type: 'bytes', value: template.encodedParameters },
  ];
}

export function getExpectedTemplateId(template: ApiCallTemplate): string {
  const validatedFields = getTemplateIdValidationFields(template);
  const types = validatedFields.map((v) => v.type);
  const values = validatedFields.map((v) => v.value);
  const {
    utils: { keccak256, solidityPack },
  } = ethers;

  return keccak256(solidityPack(types, values));
}

interface ApiCallTemplatesById {
  readonly [id: string]: ApiCallTemplate;
}

export function verify(
  apiCalls: Request<ApiCall>[],
  templatesById: ApiCallTemplatesById
): LogsData<Request<ApiCall>[]> {
  const logsWithVerifiedApiCalls: LogsData<Request<ApiCall>>[] = apiCalls.map((apiCall) => {
    if (!apiCall.templateId) {
      return [[], apiCall];
    }

    if (apiCall.status !== RequestStatus.Pending) {
      const log = logger.pend(
        'DEBUG',
        `Template verification for Request:${apiCall.id} skipped as it has status:${apiCall.status}`
      );
      return [[log], apiCall];
    }

    const template = templatesById[apiCall.templateId];
    // If a template was expected, but not found, something else has gone wrong.
    // This should not happen
    if (!template) {
      const log = logger.pend(
        'ERROR',
        `Ignoring Request:${apiCall.id} as the template could not be found for verification`
      );
      const updatedApiCall: Request<ApiCall> = {
        ...apiCall,
        status: RequestStatus.Ignored,
        errorMessage: `${RequestErrorMessage.TemplateNotFound}: ${apiCall.templateId}`,
      };
      return [[log], updatedApiCall];
    }

    const expectedTemplateId = getExpectedTemplateId(template);
    const valid = apiCall.templateId === expectedTemplateId;
    if (!valid) {
      const log = logger.pend(
        'ERROR',
        `Invalid template ID:${apiCall.templateId} found for Request:${apiCall.id}. Expected template ID:${expectedTemplateId}`
      );
      const updatedApiCall: Request<ApiCall> = {
        ...apiCall,
        status: RequestStatus.Ignored,
        errorMessage: `${RequestErrorMessage.TemplateIdInvalid}: ${apiCall.templateId}`,
      };
      return [[log], updatedApiCall];
    }

    const log = logger.pend('DEBUG', `Request ID:${apiCall.id} is linked to a valid template ID:${template.id}`);
    return [[log], apiCall];
  });

  const logs = flatMap(logsWithVerifiedApiCalls, (a) => a[0]);
  const verifiedApiCalls = flatMap(logsWithVerifiedApiCalls, (a) => a[1]);
  return [logs, verifiedApiCalls];
}
