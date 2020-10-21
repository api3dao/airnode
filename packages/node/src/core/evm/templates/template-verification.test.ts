import { ethers } from 'ethers';
import * as fixtures from 'test/fixtures';
import * as verification from './template-verification';
import { RequestErrorCode, RequestStatus } from 'src/types';

describe('verify', () => {
  const TEMPLATE_ID = '0x101c36202b92b358adda664515ea920f76b1edcf5f1285ab0c845f54638b45aa';

  it('returns API calls not linked to templates', () => {
    const apiCall = fixtures.requests.createApiCall({ templateId: null });
    const [logs, res] = verification.verify([apiCall], {});
    expect(logs).toEqual([]);
    expect(res).toEqual([apiCall]);
  });

  it('returns API calls that are errored', () => {
    const apiCall = fixtures.requests.createApiCall({ templateId: TEMPLATE_ID, status: RequestStatus.Errored });
    const [logs, res] = verification.verify([apiCall], {});
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message: `Template verification for Request:${apiCall.id} skipped as it has status code:${RequestStatus.Errored}`,
      },
    ]);
    expect(res).toEqual([apiCall]);
  });

  it('returns API calls that are blocked', () => {
    const apiCall = fixtures.requests.createApiCall({ templateId: TEMPLATE_ID, status: RequestStatus.Blocked });
    const [logs, res] = verification.verify([apiCall], {});
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message: `Template verification for Request:${apiCall.id} skipped as it has status code:${RequestStatus.Blocked}`,
      },
    ]);
    expect(res).toEqual([apiCall]);
  });

  it('returns API calls that are ignored', () => {
    const apiCall = fixtures.requests.createApiCall({ templateId: TEMPLATE_ID, status: RequestStatus.Ignored });
    const [logs, res] = verification.verify([apiCall], {});
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message: `Template verification for Request:${apiCall.id} skipped as it has status code:${RequestStatus.Ignored}`,
      },
    ]);
    expect(res).toEqual([apiCall]);
  });

  it('ignores API calls where the template cannot be found', () => {
    const apiCall = fixtures.requests.createApiCall({ templateId: TEMPLATE_ID });
    const [logs, res] = verification.verify([apiCall], {});
    expect(logs).toEqual([
      { level: 'ERROR', message: `Ignoring Request:${apiCall.id} as the template could not be found for verification` },
    ]);
    expect(res[0]).toEqual({ ...apiCall, status: RequestStatus.Ignored, errorCode: RequestErrorCode.TemplateNotFound });
  });

  it('does nothing where API calls are linked to a valid templated', () => {
    const apiCall = fixtures.requests.createApiCall({
      templateId: '0x101c36202b92b358adda664515ea920f76b1edcf5f1285ab0c845f54638b45aa',
    });
    const template = fixtures.requests.createApiCallTemplate({
      designatedWallet: '0xeadFE69e7D9E1d369D05DF6a88F687129523e16d',
      encodedParameters: '0x6466726f6d63455448',
      endpointId: '0x2f3a3adf6daf5a3bb00ab83aa82262a6a84b59b0a89222386135330a1819ab48',
      fulfillAddress: '0x197F3826040dF832481f835652c290aC7c41f073',
      fulfillFunctionId: '0xd3bd1464',
      id: TEMPLATE_ID,
      providerId: '0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9',
      requesterIndex: '1',
    });
    const templatesById = { [TEMPLATE_ID]: template };
    const [logs, res] = verification.verify([apiCall], templatesById);
    expect(logs).toEqual([
      { level: 'DEBUG', message: `Request ID:apiCallId is linked to a valid template ID:${TEMPLATE_ID}` },
    ]);
    expect(res[0]).toEqual(apiCall);
  });

  describe('invalid fields', () => {
    const apiCall = fixtures.requests.createApiCall({
      templateId: '0x101c36202b92b358adda664515ea920f76b1edcf5f1285ab0c845f54638b45aa',
    });

    const validTemplate = fixtures.requests.createApiCallTemplate({
      designatedWallet: '0xeadFE69e7D9E1d369D05DF6a88F687129523e16d',
      encodedParameters: '0x6466726f6d63455448',
      endpointId: '0x2f3a3adf6daf5a3bb00ab83aa82262a6a84b59b0a89222386135330a1819ab48',
      fulfillAddress: '0x197F3826040dF832481f835652c290aC7c41f073',
      fulfillFunctionId: '0xd3bd1464',
      id: TEMPLATE_ID,
      providerId: '0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9',
      requesterIndex: '1',
    });

    const invalidFields = {
      designatedWallet: ethers.constants.AddressZero,
      encodedParameters: '0x1234',
      endpointId: ethers.constants.HashZero,
      fulfillAddress: ethers.constants.AddressZero,
      fulfillFunctionId: '0x12341464',
      providerId: ethers.constants.HashZero,
      requesterIndex: '2',
    };

    Object.keys(invalidFields).forEach((field) => {
      it(`is invalid if ${field} has been changed`, () => {
        const invalidTemplate = { ...validTemplate, [field]: invalidFields[field] };
        const templatesById = { [TEMPLATE_ID]: invalidTemplate };
        const expectedTemplateId = verification.getExpectedTemplateId(invalidTemplate);
        const [logs, res] = verification.verify([apiCall], templatesById);
        expect(logs).toEqual([
          {
            level: 'ERROR',
            message: `Invalid template ID:${apiCall.templateId} found for Request:${apiCall.id}. Expected template ID:${expectedTemplateId}`,
          },
        ]);
        expect(res[0]).toEqual({
          ...apiCall,
          status: RequestStatus.Ignored,
          errorCode: RequestErrorCode.InvalidTemplate,
        });
      });
    });
  });
});
