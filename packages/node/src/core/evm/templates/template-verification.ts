import { ethers } from 'ethers';
import flatMap from 'lodash/flatMap';
import * as logger from '../../logger';
import { ApiCall, ApiCallTemplate, ClientRequest, LogsData, RequestErrorCode, RequestStatus } from '../../../types';

interface ApiCallTemplatesById {
  [id: string]: ApiCallTemplate;
}

function getExpectedTemplateId(template: ApiCallTemplate): string {
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'uint256', 'address', 'address', 'bytes4', 'bytes'],
      [
        template.providerId,
        template.endpointId,
        template.requesterIndex,
        template.designatedWallet,
        template.fulfillAddress,
        template.fulfillFunctionId,
        template.encodedParameters,
      ]
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

    // If the request is already errored or ignored, then we don't want to make further updates
    // to either the status or error code
    if (apiCall.status === RequestStatus.Errored || apiCall.status === RequestStatus.Ignored) {
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
      const log = logger.pend('ERROR', `Could not find template for Request:${apiCall.id} for template verification`);
      return [[log], apiCall];
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
        errorCode: RequestErrorCode.InvalidTemplateId,
      };
      return [[log], updatedApiCall];
    }

    const log = logger.pend('DEBUG', `Request ID:${apiCall.id} is linked to a valid template`);
    return [[log], apiCall];
  });

  const logs = flatMap(logsWithVerifiedApiCalls, (a) => a[0]);
  const verifiedApiCalls = flatMap(logsWithVerifiedApiCalls, (a) => a[1]);
  return [logs, verifiedApiCalls];
}
