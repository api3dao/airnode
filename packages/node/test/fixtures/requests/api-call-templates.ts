import { ApiCallTemplate } from '../../../src/types';

export function createApiCall(params?: any): ApiCallTemplate {
  return {
    encodedParameters: '0x6874656d706c6174656576616c7565',
    endpointId: 'endpointId',
    errorAddress: 'templateErrorAddress',
    errorFunctionId: 'templateErrorFunctionId',
    fulfillAddress: 'templateFulfillFunctionId',
    fulfillFunctionId: 'templateFulfillFunctionId',
    providerId: 'providerId',
    templateId: 'templateId',
    ...params,
  };
}
