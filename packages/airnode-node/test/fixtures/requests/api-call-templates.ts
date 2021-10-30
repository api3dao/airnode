import { ApiCallTemplate } from '../../../src/types';

export function buildApiCallTemplate(params?: Partial<ApiCallTemplate>): ApiCallTemplate {
  // These fields have invalid values on purpose to allow for easier reading. When necessary,
  // they can be overridden with valid values
  return {
    airnodeAddress: 'airnodeAddress',
    endpointId: 'endpointId',
    encodedParameters: '0x6874656d706c6174656576616c7565',
    id: 'templateId',
    ...params,
  };
}
