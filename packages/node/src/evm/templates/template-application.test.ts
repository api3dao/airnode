import * as application from './template-application';
import * as fixtures from '../../../test/fixtures';
import { ApiCallTemplate, RequestErrorCode, RequestStatus } from '../../types';

describe('mergeApiCallsWithTemplates', () => {
  it('returns API calls without a template ID', () => {
    const apiCall = fixtures.requests.buildApiCall({ templateId: null });
    const [logs, res] = application.mergeApiCallsWithTemplates([apiCall], {});
    expect(logs).toEqual([{ level: 'DEBUG', message: `Request:${apiCall.id} is not linked to a template` }]);
    expect(res).toEqual([apiCall]);
  });

  it('merges the template into the API call', () => {
    const apiCall = fixtures.requests.buildApiCall({
      airnodeAddress: null,
      endpointId: null,
      parameters: {},
      templateId: 'templateId-0',
    });

    const templatesById: { readonly [id: string]: ApiCallTemplate } = {
      'templateId-0': {
        airnodeAddress: 'templateAirnode-0',
        encodedParameters:
          '0x315375000000000000000000000000000000000000000000000000000000000066726f6d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0616d6f756e74000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003e800000000000000000000000000000000000000000000000000000000000000034554480000000000000000000000000000000000000000000000000000000000',
        endpointId: 'templateEndpointId-0',
        id: 'templateId-0',
      },
    };

    const [logs, res] = application.mergeApiCallsWithTemplates([apiCall], templatesById);
    expect(logs).toEqual([{ level: 'DEBUG', message: `Template ID:templateId-0 applied to Request:${apiCall.id}` }]);
    expect(res[0].airnodeAddress).toEqual('templateAirnode-0');
    expect(res[0].endpointId).toEqual('templateEndpointId-0');
    // These fields are not overwritten
    expect(res[0].fulfillAddress).toEqual('fulfillAddress');
    expect(res[0].fulfillFunctionId).toEqual('fulfillFunctionId');
    expect(res[0].sponsorWallet).toEqual('sponsorWallet');
    expect(res[0].sponsorAddress).toEqual('sponsorAddress');
  });

  it('merges template and API call parameters', () => {
    const apiCall = fixtures.requests.buildApiCall({
      templateId: 'templateId-0',
      parameters: {
        to: 'USD',
        date: '2020-10-24',
      },
    });

    const templatesById: { readonly [id: string]: ApiCallTemplate } = {
      'templateId-0': {
        airnodeAddress: 'templateAirnode-0',
        endpointId: 'templateEndpointId-0',
        encodedParameters:
          '0x315375000000000000000000000000000000000000000000000000000000000066726f6d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0616d6f756e74000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003e800000000000000000000000000000000000000000000000000000000000000034554480000000000000000000000000000000000000000000000000000000000',
        id: 'templateId-0',
      },
    };

    const [logs, res] = application.mergeApiCallsWithTemplates([apiCall], templatesById);
    expect(logs).toEqual([{ level: 'DEBUG', message: `Template ID:templateId-0 applied to Request:${apiCall.id}` }]);
    expect(res[0].parameters).toEqual({
      from: 'ETH',
      amount: '1000',
      to: 'USD',
      date: '2020-10-24',
    });
  });

  it('overwrites template parameters with request parameters with the same name', () => {
    const apiCall = fixtures.requests.buildApiCall({
      templateId: 'templateId-0',
      parameters: { from: 'BTC', amount: '5000' },
    });

    const templatesById: { readonly [id: string]: ApiCallTemplate } = {
      'templateId-0': {
        airnodeAddress: 'templateAirnode-0',
        endpointId: 'templateEndpointId-0',
        encodedParameters:
          '0x315375000000000000000000000000000000000000000000000000000000000066726f6d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0616d6f756e74000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003e800000000000000000000000000000000000000000000000000000000000000034554480000000000000000000000000000000000000000000000000000000000',
        id: 'templateId-0',
      },
    };

    const [logs, res] = application.mergeApiCallsWithTemplates([apiCall], templatesById);
    expect(logs).toEqual([{ level: 'DEBUG', message: `Template ID:templateId-0 applied to Request:${apiCall.id}` }]);
    expect(res[0].parameters).toEqual({ from: 'BTC', amount: '5000' });
  });

  it('blocks API calls where the template cannot be found', () => {
    const apiCall = fixtures.requests.buildApiCall({ templateId: 'templateId-0' });
    const [logs, res] = application.mergeApiCallsWithTemplates([apiCall], {});
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Unable to fetch template ID:templateId-0 for Request ID:apiCallId' },
    ]);
    expect(res[0].status).toEqual(RequestStatus.Blocked);
    expect(res[0].errorCode).toEqual(RequestErrorCode.TemplateNotFound);
  });

  it('invalidates API calls with invalid template parameters', () => {
    const apiCall = fixtures.requests.buildApiCall({ templateId: 'templateId-0' });

    const templatesById: { readonly [id: string]: ApiCallTemplate } = {
      'templateId-0': {
        airnodeAddress: 'templateAirnode-0',
        endpointId: 'templateEndpointId-0',
        encodedParameters: 'invalid-parameters',
        id: 'templateId-0',
      },
    };

    const [logs, res] = application.mergeApiCallsWithTemplates([apiCall], templatesById);
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Template ID:templateId-0 contains invalid parameters: invalid-parameters' },
    ]);
    expect(res[0].status).toEqual(RequestStatus.Errored);
    expect(res[0].errorCode).toEqual(RequestErrorCode.TemplateParameterDecodingFailed);
  });
});
