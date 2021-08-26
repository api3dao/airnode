import * as verification from './template-verification';
import * as fixtures from '../../../test/fixtures';
import * as requests from '../../requests';
import { RequestErrorCode, RequestStatus } from '../../types';

describe('TEMPLATE_VALIDATION_FIELDS', () => {
  it('returns the list of validated template fields', () => {
    expect(verification.TEMPLATE_VALIDATION_FIELDS).toEqual(['airnodeAddress', 'endpointId', 'encodedParameters']);
  });
});

describe('verify', () => {
  const validTemplateFiels = {
    airnodeAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    endpointId: '0x2f3a3adf6daf5a3bb00ab83aa82262a6a84b59b0a89222386135330a1819ab48',
    encodedParameters: '0x6466726f6d63455448',
  };

  const TEMPLATE_ID = '0xb2f063157fcc3c986daf4c2cf1b8ac8b8843f2b1a54c5de5e1ebdf12fb85a927';

  it('returns API calls not linked to templates', () => {
    const apiCall = fixtures.requests.buildApiCall({ templateId: null });
    const [logs, res] = verification.verify([apiCall], {});
    expect(logs).toEqual([]);
    expect(res).toEqual([apiCall]);
  });

  requests.getStatusNames().forEach((status) => {
    if (status !== 'Pending') {
      it(`returns API calls that have status: ${status}`, () => {
        const apiCall = fixtures.requests.buildApiCall({
          templateId: TEMPLATE_ID,
          status: RequestStatus[status as RequestStatus],
        });
        const [logs, res] = verification.verify([apiCall], {});
        expect(logs).toEqual([
          {
            level: 'DEBUG',
            message: `Template verification for Request:${apiCall.id} skipped as it has status:${status}`,
          },
        ]);
        expect(res).toEqual([apiCall]);
      });
    }
  });

  it('ignores API calls where the template cannot be found', () => {
    const apiCall = fixtures.requests.buildApiCall({ templateId: TEMPLATE_ID });
    const [logs, res] = verification.verify([apiCall], {});
    expect(logs).toEqual([
      { level: 'ERROR', message: `Ignoring Request:${apiCall.id} as the template could not be found for verification` },
    ]);
    expect(res[0]).toEqual({ ...apiCall, status: RequestStatus.Ignored, errorCode: RequestErrorCode.TemplateNotFound });
  });

  it('does nothing where API calls are linked to a valid templated', () => {
    const apiCall = fixtures.requests.buildApiCall({
      templateId: TEMPLATE_ID,
    });
    const template = fixtures.requests.buildApiCallTemplate({
      ...validTemplateFiels,
      id: TEMPLATE_ID,
    });
    const templatesById = { [TEMPLATE_ID]: template };
    const [logs, res] = verification.verify([apiCall], templatesById);
    expect(logs).toEqual([
      { level: 'DEBUG', message: `Request ID:apiCallId is linked to a valid template ID:${TEMPLATE_ID}` },
    ]);
    expect(res[0]).toEqual(apiCall);
  });

  describe('invalid fields', () => {
    const apiCall = fixtures.requests.buildApiCall({
      templateId: TEMPLATE_ID,
    });

    const validTemplate = fixtures.requests.buildApiCallTemplate({
      ...validTemplateFiels,
      id: TEMPLATE_ID,
    });

    const invalidFields = {
      airnodeAddress: '0x641eeb15B15d8E2CFB5f9d6480B175d93c14e6B6',
      endpointId: '0x05218bc3e2497776d24b7da2890e12c910d07ce647cc45bd565cbb167e620df3',
      encodedParameters: '0x1234',
    };

    it('validates all template fields', () => {
      // Copy the array to avoid mutating it through sort
      const validatedFields = JSON.parse(JSON.stringify(verification.TEMPLATE_VALIDATION_FIELDS));
      expect(Object.keys(invalidFields).sort()).toEqual(validatedFields.sort());
    });

    Object.keys(invalidFields).forEach((field) => {
      it(`is invalid if ${field} has been changed`, () => {
        const invalidTemplate = { ...validTemplate, [field]: (invalidFields as any)[field] };
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
          errorCode: RequestErrorCode.TemplateInvalid,
        });
      });
    });
  });
});
