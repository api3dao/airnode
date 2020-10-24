import { ApiCallTemplate } from '../../../src/types';

export function createApiCallTemplate(params?: Partial<ApiCallTemplate>): ApiCallTemplate {
  // These fields have invalid values on purpose to allow for easier reading. When necessary,
  // they can be overridden with valid values
  return {
    designatedWallet: 'designatedWallet',
    encodedParameters: '0x6874656d706c6174656576616c7565',
    endpointId: 'endpointId',
    fulfillAddress: 'templateFulfillFunctionId',
    fulfillFunctionId: 'templateFulfillFunctionId',
    id: 'templateId',
    providerId: 'providerId',
    requesterIndex: 'requesterIndex',
    ...params,
  };
}
