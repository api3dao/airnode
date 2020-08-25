import * as fixtures from 'test/fixtures';
import * as providerState from '../providers/state';
import { ApiCallTemplate, ProviderState, RequestErrorCode } from '../../types';
import * as application from './template-application';

jest.mock('../config', () => ({
  security: {
    masterKeyMnemonic: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
  },
}));

describe('mapApiCallsWithTemplates', () => {
  let initialState: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    initialState = providerState.create(config, 0);
  });

  it('returns API calls without a template ID', () => {
    const apiCalls = [fixtures.requests.createApiCall({ templateId: null })];
    const state = providerState.update(initialState, { requests: { ...initialState.requests, apiCalls } });
    const res = application.mapApiCallsWithTemplates(state, {});
    expect(res.length).toEqual(1);
    expect(res[0].templateId).toEqual(null);
  });

  it('merges the template into the API call', () => {
    const apiCalls = [
      fixtures.requests.createApiCall({
        templateId: 'templateId-0',
        endpointId: null,
        fulfillAddress: null,
        fulfillFunctionId: null,
        errorAddress: null,
        errorFunctionId: null,
        parameters: {},
      }),
    ];
    const state = providerState.update(initialState, { requests: { ...initialState.requests, apiCalls } });

    const templatesById: { [id: string]: ApiCallTemplate } = {
      'templateId-0': {
        endpointId: 'templateEndpointId-0',
        fulfillAddress: 'templateFulfillAddress-0',
        fulfillFunctionId: 'templateFulfillFunctionId-0',
        errorAddress: 'templateErrorAddress-0',
        errorFunctionId: 'templateErrorFunctionId-0',
        encodedParameters: '0x6874656d706c6174656576616c7565',
        providerId: 'templateProviderId-0',
        templateId: 'templateId-0',
      },
    };

    const res = application.mapApiCallsWithTemplates(state, templatesById);
    expect(res[0].endpointId).toEqual('templateEndpointId-0');
    expect(res[0].fulfillAddress).toEqual('templateFulfillAddress-0');
    expect(res[0].fulfillFunctionId).toEqual('templateFulfillFunctionId-0');
    expect(res[0].errorAddress).toEqual('templateErrorAddress-0');
    expect(res[0].errorFunctionId).toEqual('templateErrorFunctionId-0');
  });

  it('merges template and API call parameters', () => {
    const apiCalls = [
      fixtures.requests.createApiCall({
        templateId: 'templateId-0',
        parameters: {
          from: 'ETH',
          amount: '1',
        },
      }),
    ];
    const state = providerState.update(initialState, { requests: { ...initialState.requests, apiCalls } });

    const templatesById: { [id: string]: ApiCallTemplate } = {
      'templateId-0': {
        endpointId: 'templateEndpointId-0',
        fulfillAddress: 'templateFulfillAddress-0',
        fulfillFunctionId: 'templateFulfillFunctionId-0',
        errorAddress: 'templateErrorAddress-0',
        errorFunctionId: 'templateErrorFunctionId-0',
        encodedParameters: '0x6874656d706c6174656576616c7565',
        providerId: 'templateProviderId-0',
        templateId: 'templateId-0',
      },
    };

    const res = application.mapApiCallsWithTemplates(state, templatesById);
    expect(res[0].parameters).toEqual({
      from: 'ETH',
      amount: '1',
      template: 'value',
    });
  });

  it('overwrites template parameters with request parameters', () => {
    const apiCalls = [
      fixtures.requests.createApiCall({
        templateId: 'templateId-0',
        endpointId: 'requestEndpointId',
        fulfillAddress: 'requestFulfillAddress',
        fulfillFunctionId: 'requestFulfillFunctionId',
        errorAddress: 'requestErrorAddress',
        errorFunctionId: 'requestErrorFunctionId',
        parameters: { template: 'this will overwrite the template' },
      }),
    ];
    const state = providerState.update(initialState, { requests: { ...initialState.requests, apiCalls } });

    const templatesById: { [id: string]: ApiCallTemplate } = {
      'templateId-0': {
        endpointId: 'templateEndpointId-0',
        fulfillAddress: 'templateFulfillAddress-0',
        fulfillFunctionId: 'templateFulfillFunctionId-0',
        errorAddress: 'templateErrorAddress-0',
        errorFunctionId: 'templateErrorFunctionId-0',
        encodedParameters: '0x6874656d706c6174656576616c7565',
        providerId: 'templateProviderId-0',
        templateId: 'templateId-0',
      },
    };

    const res = application.mapApiCallsWithTemplates(state, templatesById);
    expect(res[0].endpointId).toEqual('requestEndpointId');
    expect(res[0].fulfillAddress).toEqual('requestFulfillAddress');
    expect(res[0].fulfillFunctionId).toEqual('requestFulfillFunctionId');
    expect(res[0].errorAddress).toEqual('requestErrorAddress');
    expect(res[0].errorFunctionId).toEqual('requestErrorFunctionId');
    expect(res[0].parameters).toEqual({ template: 'this will overwrite the template' });
  });

  it('discards API calls where the template cannot be found', () => {
    const apiCalls = [fixtures.requests.createApiCall({ templateId: 'templateId-0' })];
    const state = providerState.update(initialState, { requests: { ...initialState.requests, apiCalls } });
    const res = application.mapApiCallsWithTemplates(state, {});
    expect(res).toEqual([]);
  });

  it('invalidates API calls with invalid template parameters', () => {
    const apiCalls = [fixtures.requests.createApiCall({ templateId: 'templateId-0' })];
    const state = providerState.update(initialState, { requests: { ...initialState.requests, apiCalls } });

    const templatesById: { [id: string]: ApiCallTemplate } = {
      'templateId-0': {
        endpointId: 'templateEndpointId-0',
        fulfillAddress: 'templateFulfillAddress-0',
        fulfillFunctionId: 'templateFulfillFunctionId-0',
        errorAddress: 'templateErrorAddress-0',
        errorFunctionId: 'templateErrorFunctionId-0',
        encodedParameters: 'invalid-parameters',
        providerId: 'templateProviderId-0',
        templateId: 'templateId-0',
      },
    };

    const res = application.mapApiCallsWithTemplates(state, templatesById);
    expect(res[0].valid).toEqual(false);
    expect(res[0].errorCode).toEqual(RequestErrorCode.InvalidTemplateParameters);
  });
});
