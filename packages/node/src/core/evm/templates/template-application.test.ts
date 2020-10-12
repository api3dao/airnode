import * as fixtures from 'test/fixtures';
import { ApiCallTemplate, RequestErrorCode, RequestStatus, WalletDataByIndex } from '../../../types';
import * as application from './template-application';

describe('mergeApiCallsWithTemplates', () => {
  it('returns API calls without a template ID', () => {
    const apiCall = fixtures.requests.createApiCall({ templateId: null });
    const walletDataByIndex: WalletDataByIndex = {
      1: {
        address: '0x1',
        requests: {
          apiCalls: [apiCall],
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
    const walletDataByIndex: WalletDataByIndex = {
      1: {
        address: '0x1',
        requests: {
          apiCalls: [apiCall],
          withdrawals: [],
        },
        transactionCount: 3,
      },
    };

    const templatesById: { [id: string]: ApiCallTemplate } = {
      'templateId-0': {
        designatedWallet: 'designatedWallet-0',
        endpointId: 'templateEndpointId-0',
        fulfillAddress: 'templateFulfillAddress-0',
        fulfillFunctionId: 'templateFulfillFunctionId-0',
        encodedParameters: '0x6874656d706c6174656576616c7565',
        providerId: 'templateProviderId-0',
        requesterIndex: 'requesterIndex-0',
        templateId: 'templateId-0',
      },
    };

    const [logs, err, res] = application.mergeApiCallsWithTemplates(walletDataByIndex, templatesById);
    expect(logs).toEqual([]);
    expect(err).toEqual(null);
    const resApiCall = res[1].requests.apiCalls[0];
    expect(resApiCall.designatedWallet).toEqual('designatedWallet-0');
    expect(resApiCall.endpointId).toEqual('templateEndpointId-0');
    expect(resApiCall.fulfillAddress).toEqual('templateFulfillAddress-0');
    expect(resApiCall.fulfillFunctionId).toEqual('templateFulfillFunctionId-0');
    expect(resApiCall.requesterIndex).toEqual('requesterIndex-0');
    expect(resApiCall.errorAddress).toEqual(null);
    expect(resApiCall.errorFunctionId).toEqual(null);
  });

  it('merges template and API call parameters', () => {
    const apiCall = fixtures.requests.createApiCall({
      templateId: 'templateId-0',
      parameters: {
        from: 'ETH',
        amount: '1',
      },
    });
    const walletDataByIndex: WalletDataByIndex = {
      1: {
        address: '0x1',
        requests: {
          apiCalls: [apiCall],
          withdrawals: [],
        },
        transactionCount: 3,
      },
    };

    const templatesById: { [id: string]: ApiCallTemplate } = {
      'templateId-0': {
        designatedWallet: 'designatedWallet-0',
        endpointId: 'templateEndpointId-0',
        fulfillAddress: 'templateFulfillAddress-0',
        fulfillFunctionId: 'templateFulfillFunctionId-0',
        encodedParameters: '0x6874656d706c6174656576616c7565',
        providerId: 'templateProviderId-0',
        requesterIndex: 'requesterIndex-0',
        templateId: 'templateId-0',
      },
    };

    const [logs, err, res] = application.mergeApiCallsWithTemplates(walletDataByIndex, templatesById);
    expect(logs).toEqual([]);
    expect(err).toEqual(null);
    const resApiCall = res[1].requests.apiCalls[0];
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
    const walletDataByIndex: WalletDataByIndex = {
      1: {
        address: '0x1',
        requests: {
          apiCalls: [apiCall],
          withdrawals: [],
        },
        transactionCount: 3,
      },
    };

    const templatesById: { [id: string]: ApiCallTemplate } = {
      'templateId-0': {
        designatedWallet: 'designatedWallet-0',
        endpointId: 'templateEndpointId-0',
        fulfillAddress: 'templateFulfillAddress-0',
        fulfillFunctionId: 'templateFulfillFunctionId-0',
        encodedParameters: '0x6874656d706c6174656576616c7565',
        providerId: 'templateProviderId-0',
        requesterIndex: 'requesterIndex-0',
        templateId: 'templateId-0',
      },
    };

    const [logs, err, res] = application.mergeApiCallsWithTemplates(walletDataByIndex, templatesById);
    expect(logs).toEqual([]);
    expect(err).toEqual(null);
    const resApiCall = res[1].requests.apiCalls[0];
    expect(resApiCall.endpointId).toEqual('requestEndpointId');
    expect(resApiCall.fulfillAddress).toEqual('requestFulfillAddress');
    expect(resApiCall.fulfillFunctionId).toEqual('requestFulfillFunctionId');
    expect(resApiCall.errorAddress).toEqual('requestErrorAddress');
    expect(resApiCall.errorFunctionId).toEqual('requestErrorFunctionId');
    expect(resApiCall.parameters).toEqual({ template: 'this will overwrite the template' });
  });

  it('blocks API calls where the template cannot be found', () => {
    const walletDataByIndex: WalletDataByIndex = {
      1: {
        address: '0x1',
        requests: {
          apiCalls: [fixtures.requests.createApiCall({ templateId: 'templateId-0' })],
          withdrawals: [],
        },
        transactionCount: 3,
      },
    };
    const [logs, err, res] = application.mergeApiCallsWithTemplates(walletDataByIndex, {});
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Unable to fetch template ID:templateId-0 for Request ID:apiCallId' },
    ]);
    expect(err).toEqual(null);
    const resApiCall = res[1].requests.apiCalls[0];
    expect(resApiCall.status).toEqual(RequestStatus.Blocked);
    expect(resApiCall.errorCode).toEqual(RequestErrorCode.TemplateNotFound);
  });

  it('invalidates API calls with invalid template parameters', () => {
    const walletDataByIndex: WalletDataByIndex = {
      1: {
        address: '0x1',
        requests: {
          apiCalls: [fixtures.requests.createApiCall({ templateId: 'templateId-0' })],
          withdrawals: [],
        },
        transactionCount: 3,
      },
    };

    const templatesById: { [id: string]: ApiCallTemplate } = {
      'templateId-0': {
        designatedWallet: 'designatedWallet-0',
        endpointId: 'templateEndpointId-0',
        fulfillAddress: 'templateFulfillAddress-0',
        fulfillFunctionId: 'templateFulfillFunctionId-0',
        encodedParameters: 'invalid-parameters',
        providerId: 'templateProviderId-0',
        requesterIndex: 'requesterIndex-0',
        templateId: 'templateId-0',
      },
    };

    const [logs, err, res] = application.mergeApiCallsWithTemplates(walletDataByIndex, templatesById);
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Template ID:apiCallId contains invalid parameters: invalid-parameters' },
    ]);
    expect(err).toEqual(null);
    const resApiCall = res[1].requests.apiCalls[0];
    expect(resApiCall.status).toEqual(RequestStatus.Errored);
    expect(resApiCall.errorCode).toEqual(RequestErrorCode.InvalidTemplateParameters);
  });
});
