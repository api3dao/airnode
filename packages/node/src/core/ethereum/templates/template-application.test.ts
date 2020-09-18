import * as fixtures from 'test/fixtures';
import { ApiCallTemplate, ProviderState, RequestErrorCode, RequestStatus, WalletDataByIndex } from '../../../types';
import * as application from './template-application';

describe('mergeApiCallsWithTemplates', () => {
  it('returns API calls without a template ID', () => {
    const apiCall = fixtures.requests.createApiCall({ templateId: null });
    const walletDataByIndex: WalletDataByIndex = {
      1: {
        address: '0x1',
        requests: {
          apiCalls: [apiCall],
          walletDesignations: [],
          withdrawals: [],
        },
        transactionCount: 3,
      },
    };
    const [logs, err, res] = application.mergeApiCallsWithTemplates(walletDataByIndex, {});
    expect(logs).toEqual([]);
    expect(err).toEqual(null);
    expect(res[1].requests.apiCalls).toEqual([apiCall]);
  });
  //
  //   it('merges the template into the API call', () => {
  //     const apiCall = fixtures.requests.createApiCall({
  //       templateId: 'templateId-0',
  //       endpointId: null,
  //       fulfillAddress: null,
  //       fulfillFunctionId: null,
  //       errorAddress: null,
  //       errorFunctionId: null,
  //       parameters: {},
  //     });
  //     const walletData = {
  //       address: '0x1',
  //       requests: {
  //         apiCalls: [apiCall],
  //         walletDesignations: [],
  //         withdrawals: [],
  //       },
  //       transactionCount: 3,
  //     };
  //     const state = providerState.update(initialState, { walletDataByIndex: { 1: walletData } });
  //
  //     const templatesById: { [id: string]: ApiCallTemplate } = {
  //       'templateId-0': {
  //         endpointId: 'templateEndpointId-0',
  //         fulfillAddress: 'templateFulfillAddress-0',
  //         fulfillFunctionId: 'templateFulfillFunctionId-0',
  //         errorAddress: 'templateErrorAddress-0',
  //         errorFunctionId: 'templateErrorFunctionId-0',
  //         encodedParameters: '0x6874656d706c6174656576616c7565',
  //         providerId: 'templateProviderId-0',
  //         templateId: 'templateId-0',
  //       },
  //     };
  //
  //     const res = application.mergeApiCallsWithTemplates(state, templatesById);
  //     const resApiCall = res.walletDataByIndex[1].requests.apiCalls[0];
  //     expect(resApiCall.endpointId).toEqual('templateEndpointId-0');
  //     expect(resApiCall.fulfillAddress).toEqual('templateFulfillAddress-0');
  //     expect(resApiCall.fulfillFunctionId).toEqual('templateFulfillFunctionId-0');
  //     expect(resApiCall.errorAddress).toEqual('templateErrorAddress-0');
  //     expect(resApiCall.errorFunctionId).toEqual('templateErrorFunctionId-0');
  //   });
  //
  //   it('merges template and API call parameters', () => {
  //     const apiCall = fixtures.requests.createApiCall({
  //       templateId: 'templateId-0',
  //       parameters: {
  //         from: 'ETH',
  //         amount: '1',
  //       },
  //     });
  //     const walletData = {
  //       address: '0x1',
  //       requests: {
  //         apiCalls: [apiCall],
  //         walletDesignations: [],
  //         withdrawals: [],
  //       },
  //       transactionCount: 3,
  //     };
  //     const state = providerState.update(initialState, { walletDataByIndex: { 1: walletData } });
  //
  //     const templatesById: { [id: string]: ApiCallTemplate } = {
  //       'templateId-0': {
  //         endpointId: 'templateEndpointId-0',
  //         fulfillAddress: 'templateFulfillAddress-0',
  //         fulfillFunctionId: 'templateFulfillFunctionId-0',
  //         errorAddress: 'templateErrorAddress-0',
  //         errorFunctionId: 'templateErrorFunctionId-0',
  //         encodedParameters: '0x6874656d706c6174656576616c7565',
  //         providerId: 'templateProviderId-0',
  //         templateId: 'templateId-0',
  //       },
  //     };
  //
  //     const res = application.mergeApiCallsWithTemplates(state, templatesById);
  //     const resApiCall = res.walletDataByIndex[1].requests.apiCalls[0];
  //     expect(resApiCall.parameters).toEqual({
  //       from: 'ETH',
  //       amount: '1',
  //       template: 'value',
  //     });
  //   });
  //
  //   it('overwrites template parameters with request parameters', () => {
  //     const apiCall = fixtures.requests.createApiCall({
  //       templateId: 'templateId-0',
  //       endpointId: 'requestEndpointId',
  //       fulfillAddress: 'requestFulfillAddress',
  //       fulfillFunctionId: 'requestFulfillFunctionId',
  //       errorAddress: 'requestErrorAddress',
  //       errorFunctionId: 'requestErrorFunctionId',
  //       parameters: { template: 'this will overwrite the template' },
  //     });
  //     const walletData = {
  //       address: '0x1',
  //       requests: {
  //         apiCalls: [apiCall],
  //         walletDesignations: [],
  //         withdrawals: [],
  //       },
  //       transactionCount: 3,
  //     };
  //     const state = providerState.update(initialState, { walletDataByIndex: { 1: walletData } });
  //
  //     const templatesById: { [id: string]: ApiCallTemplate } = {
  //       'templateId-0': {
  //         endpointId: 'templateEndpointId-0',
  //         fulfillAddress: 'templateFulfillAddress-0',
  //         fulfillFunctionId: 'templateFulfillFunctionId-0',
  //         errorAddress: 'templateErrorAddress-0',
  //         errorFunctionId: 'templateErrorFunctionId-0',
  //         encodedParameters: '0x6874656d706c6174656576616c7565',
  //         providerId: 'templateProviderId-0',
  //         templateId: 'templateId-0',
  //       },
  //     };
  //
  //     const res = application.mergeApiCallsWithTemplates(state, templatesById);
  //     const resApiCall = res.walletDataByIndex[1].requests.apiCalls[0];
  //     expect(resApiCall.endpointId).toEqual('requestEndpointId');
  //     expect(resApiCall.fulfillAddress).toEqual('requestFulfillAddress');
  //     expect(resApiCall.fulfillFunctionId).toEqual('requestFulfillFunctionId');
  //     expect(resApiCall.errorAddress).toEqual('requestErrorAddress');
  //     expect(resApiCall.errorFunctionId).toEqual('requestErrorFunctionId');
  //     expect(resApiCall.parameters).toEqual({ template: 'this will overwrite the template' });
  //   });
  //
  //   it('blocks API calls where the template cannot be found', () => {
  //     const walletData = {
  //       address: '0x1',
  //       requests: {
  //         apiCalls: [fixtures.requests.createApiCall({ templateId: 'templateId-0' })],
  //         walletDesignations: [],
  //         withdrawals: [],
  //       },
  //       transactionCount: 3,
  //     };
  //     const state = providerState.update(initialState, { walletDataByIndex: { 1: walletData } });
  //     const res = application.mergeApiCallsWithTemplates(state, {});
  //     const resApiCall = res.walletDataByIndex[1].requests.apiCalls[0];
  //     expect(resApiCall.status).toEqual(RequestStatus.Blocked);
  //     expect(resApiCall.errorCode).toEqual(RequestErrorCode.TemplateNotFound);
  //   });
  //
  //   it('invalidates API calls with invalid template parameters', () => {
  //     const walletData = {
  //       address: '0x1',
  //       requests: {
  //         apiCalls: [fixtures.requests.createApiCall({ templateId: 'templateId-0' })],
  //         walletDesignations: [],
  //         withdrawals: [],
  //       },
  //       transactionCount: 3,
  //     };
  //     const state = providerState.update(initialState, { walletDataByIndex: { 1: walletData } });
  //
  //     const templatesById: { [id: string]: ApiCallTemplate } = {
  //       'templateId-0': {
  //         endpointId: 'templateEndpointId-0',
  //         fulfillAddress: 'templateFulfillAddress-0',
  //         fulfillFunctionId: 'templateFulfillFunctionId-0',
  //         errorAddress: 'templateErrorAddress-0',
  //         errorFunctionId: 'templateErrorFunctionId-0',
  //         encodedParameters: 'invalid-parameters',
  //         providerId: 'templateProviderId-0',
  //         templateId: 'templateId-0',
  //       },
  //     };
  //
  //     const res = application.mergeApiCallsWithTemplates(state, templatesById);
  //     const resApiCall = res.walletDataByIndex[1].requests.apiCalls[0];
  //     expect(resApiCall.status).toEqual(RequestStatus.Errored);
  //     expect(resApiCall.errorCode).toEqual(RequestErrorCode.InvalidTemplateParameters);
  //   });
});
