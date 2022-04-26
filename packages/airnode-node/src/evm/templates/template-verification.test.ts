import * as verification from './template-verification';
import * as fixtures from '../../../test/fixtures';
import { verifyTemplateId } from '../../api';

// TODO: Move to call-api.test.ts
describe('verify', () => {
  const validTemplateFields = {
    endpointId: '0x2f3a3adf6daf5a3bb00ab83aa82262a6a84b59b0a89222386135330a1819ab48',
    encodedParameters: '0x6466726f6d63455448',
  };

  const TEMPLATE_ID = '0xe5d99287b5a870c3453bc0b42769c6f37cf4a3143890e9c34753181171fac842';

  it('returns API calls not linked to templates', () => {
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ templateId: null });
    const config = fixtures.buildConfig();

    const response = verifyTemplateId({ aggregatedApiCall, config });

    expect(response).toEqual(null);
  });

  it('ignores API calls where the template cannot be found', () => {
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({
      templateId: TEMPLATE_ID,
      template: undefined,
    });
    const config = fixtures.buildConfig();

    const response = verifyTemplateId({ aggregatedApiCall, config });

    expect(response).toEqual([
      [
        {
          level: 'ERROR',
          message: `Ignoring Request:${aggregatedApiCall.id} as the template could not be found for verification`,
        },
      ],
      {
        errorMessage: `Ignoring Request:${aggregatedApiCall.id} as the template could not be found for verification`,
        success: false,
      },
    ]);
  });

  it('does nothing where API calls are linked to a valid templated', () => {
    const template = fixtures.requests.buildApiCallTemplate({
      ...validTemplateFields,
      id: TEMPLATE_ID,
    });
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({
      templateId: TEMPLATE_ID,
      template,
    });
    const config = fixtures.buildConfig();

    const response = verifyTemplateId({ aggregatedApiCall, config });

    expect(response).toEqual(null);
  });

  describe('invalid fields', () => {
    const validTemplate = fixtures.requests.buildApiCallTemplate({
      ...validTemplateFields,
      id: TEMPLATE_ID,
    });
    const config = fixtures.buildConfig();
    const invalidFields = {
      endpointId: '0x05218bc3e2497776d24b7da2890e12c910d07ce647cc45bd565cbb167e620df3',
      encodedParameters: '0x1234',
    };

    Object.keys(invalidFields).forEach((field) => {
      it(`is invalid if ${field} has been changed`, () => {
        const invalidTemplate = { ...validTemplate, [field]: (invalidFields as any)[field] };
        const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({
          templateId: TEMPLATE_ID,
          template: invalidTemplate,
        });
        const expectedTemplateId = verification.getExpectedTemplateId(invalidTemplate);
        const response = verifyTemplateId({ aggregatedApiCall, config });
        expect(response).toEqual([
          [
            {
              level: 'ERROR',
              message: `Invalid template ID:${TEMPLATE_ID} found for Request:${aggregatedApiCall.id}. Expected template ID:${expectedTemplateId}`,
            },
          ],
          {
            errorMessage: `Invalid template ID:${TEMPLATE_ID} found for Request:${aggregatedApiCall.id}. Expected template ID:${expectedTemplateId}`,
            success: false,
          },
        ]);
      });
    });
  });
});
