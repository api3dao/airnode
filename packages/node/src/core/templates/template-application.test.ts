import * as fixtures from 'test/fixtures';
import * as providerState from '../providers/state';
import { ApiCallTemplate, ProviderState, RequestErrorCode, RequestStatus } from '../../types';
import * as application from './template-application';

jest.mock('../config', () => ({
  security: {
    masterKeyMnemonic: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
  },
}));

describe('mergeApiCallsWithTemplates', () => {
  let initialState: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    initialState = providerState.create(config, 0);
  });

  it('returns API calls without a template ID', () => {
    const apiCall = fixtures.requests.createApiCall({ templateId: null });
    const walletData = {
      address: '0x1',
      requests: {
        apiCalls: [apiCall],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 3,
    };
    const state = providerState.update(initialState, { walletDataByIndex: { 1: walletData } });
    const res = application.mergeApiCallsWithTemplates(state, {});
    expect(res.walletDataByIndex[1].requests.apiCalls).toEqual([apiCall]);
  });

  it('merges the template into the API call', () => {
    const apiCall = fixtures.requests.createApiCall({
      templateId: 'templateId-0',
      endpointId: null,
      fulfillAddress: null,
      fulfillFunctionId: null,
      errorAddress: null,
      errorFunctionId: null,
      parameters: {},
    });
    const walletData = {
      address: '0x1',
      requests: {
        apiCalls: [apiCall],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 3,
    };
    const state = providerState.update(initialState, { walletDataByIndex: { 1: walletData } });

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

    const res = application.mergeApiCallsWithTemplates(state, templatesById);
    const resApiCall = res.walletDataByIndex[1].requests.apiCalls[0];
    expect(resApiCall.endpointId).toEqual('templateEndpointId-0');
    expect(resApiCall.fulfillAddress).toEqual('templateFulfillAddress-0');
    expect(resApiCall.fulfillFunctionId).toEqual('templateFulfillFunctionId-0');
    expect(resApiCall.errorAddress).toEqual('templateErrorAddress-0');
    expect(resApiCall.errorFunctionId).toEqual('templateErrorFunctionId-0');
  });

  it('merges template and API call parameters', () => {
    const apiCall = fixtures.requests.createApiCall({
      templateId: 'templateId-0',
      parameters: {
        from: 'ETH',
        amount: '1',
      },
    });
    const walletData = {
      address: '0x1',
      requests: {
        apiCalls: [apiCall],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 3,
    };
    const state = providerState.update(initialState, { walletDataByIndex: { 1: walletData } });

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

    const res = application.mergeApiCallsWithTemplates(state, templatesById);
    const resApiCall = res.walletDataByIndex[1].requests.apiCalls[0];
    expect(resApiCall.parameters).toEqual({
      from: 'ETH',
      amount: '1',
      template: 'value',
    });
  });

  it('overwrites template parameters with request parameters', () => {
    const apiCall = fixtures.requests.createApiCall({
      templateId: 'templateId-0',
      endpointId: 'requestEndpointId',
      fulfillAddress: 'requestFulfillAddress',
      fulfillFunctionId: 'requestFulfillFunctionId',
      errorAddress: 'requestErrorAddress',
      errorFunctionId: 'requestErrorFunctionId',
      parameters: { template: 'this will overwrite the template' },
    });
    const walletData = {
      address: '0x1',
      requests: {
        apiCalls: [apiCall],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 3,
    };
    const state = providerState.update(initialState, { walletDataByIndex: { 1: walletData } });

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

    const res = application.mergeApiCallsWithTemplates(state, templatesById);
    const resApiCall = res.walletDataByIndex[1].requests.apiCalls[0];
    expect(resApiCall.endpointId).toEqual('requestEndpointId');
    expect(resApiCall.fulfillAddress).toEqual('requestFulfillAddress');
    expect(resApiCall.fulfillFunctionId).toEqual('requestFulfillFunctionId');
    expect(resApiCall.errorAddress).toEqual('requestErrorAddress');
    expect(resApiCall.errorFunctionId).toEqual('requestErrorFunctionId');
    expect(resApiCall.parameters).toEqual({ template: 'this will overwrite the template' });
  });

  it('blocks API calls where the template cannot be found', () => {
    const walletData = {
      address: '0x1',
      requests: {
        apiCalls: [fixtures.requests.createApiCall({ templateId: 'templateId-0' })],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 3,
    };
    const state = providerState.update(initialState, { walletDataByIndex: { 1: walletData } });
    const res = application.mergeApiCallsWithTemplates(state, {});
    const resApiCall = res.walletDataByIndex[1].requests.apiCalls[0];
    expect(resApiCall.status).toEqual(RequestStatus.Blocked);
    expect(resApiCall.errorCode).toEqual(RequestErrorCode.TemplateNotFound);
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

    const res = application.mergeApiCallsWithTemplates(state, templatesById);
    expect(res[0].valid).toEqual(false);
    expect(res[0].errorCode).toEqual(RequestErrorCode.InvalidTemplateParameters);
  });
});
