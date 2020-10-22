import { ethers } from 'ethers';
import flatMap from 'lodash/flatMap';
import * as logger from '../../logger';
import { ApiCall, ApiCallTemplate, ClientRequest, LogsData, RequestErrorCode, RequestStatus } from '../../../types';

interface ApiCallTemplatesById {
  [id: string]: ApiCallTemplate;
}

export const TEMPLATE_VALIDATION_FIELDS = [
  'providerId',
  'endpointId',
  'requesterIndex',
  'designatedWallet',
  'fulfillAddress',
  'fulfillFunctionId',
  'encodedParameters',
];

export function getExpectedTemplateId(template: ApiCallTemplate): string {
  const templateValues = TEMPLATE_VALIDATION_FIELDS.map((f) => template[f]);

  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'uint256', 'address', 'address', 'bytes4', 'bytes'],
      templateValues
    )
  );
}

export function verify(
  apiCalls: ClientRequest<ApiCall>[],
  templatesById: ApiCallTemplatesById
): LogsData<ClientRequest<ApiCall>[]> {
  const logsWithVerifiedApiCalls: LogsData<ClientRequest<ApiCall>>[] = apiCalls.map((apiCall) => {
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
      const updatedApiCall = {
        ...apiCall,
        status: RequestStatus.Ignored,
        errorCode: RequestErrorCode.TemplateNotFound,
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
      const updatedApiCall = {
        ...apiCall,
        status: RequestStatus.Ignored,
        errorCode: RequestErrorCode.InvalidTemplate,
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
