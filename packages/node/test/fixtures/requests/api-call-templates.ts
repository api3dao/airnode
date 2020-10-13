import { ApiCallTemplate } from '../../../src/types';

export function createApiCallTemplate(params?: Partial<ApiCallTemplate>): ApiCallTemplate {
  return {
    designatedWallet: 'designatedWallet',
    encodedParameters: '0x6874656d706c6174656576616c7565',
    endpointId: 'endpointId',
    fulfillAddress: 'templateFulfillFunctionId',
    fulfillFunctionId: 'templateFulfillFunctionId',
    providerId: 'providerId',
    requesterIndex: 'requesterIndex',
    templateId: 'templateId',
    ...params,
  };
}
