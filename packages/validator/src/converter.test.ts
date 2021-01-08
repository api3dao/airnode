import { validate } from './validate';
import { extraFieldMessage, formattingMessage, missingParamMessage } from './utils/messages';

const generatedOIS = {
  title: 'Swagger Petstore',
  version: '1.0.0',
  oisFormat: '1.0.0',
  apiSpecifications: {
    servers: [
      {
        url: 'http://petstore.swagger.io/api',
      },
    ],
    paths: {
      '/test': {
        get: {
          parameters: [
            {
              in: 'query',
              name: 'limit',
            },
          ],
        },
      },
    },
    components: {
      securitySchemes: {
        api_key: {
          type: 'apiKey',
          in: 'header',
          name: 'api_key',
        },
        http_basic: {
          type: 'http',
          in: 'query',
          scheme: 'Basic',
        },
      },
      security: {
        api_key: [],
        http_basic: [],
      },
    },
  },
  endpoints: [
    {
      name: 'findPets',
      operation: {
        method: 'get',
        path: '/test',
      },
      parameters: [
        {
          name: 'limit',
          operationParameter: {
            in: 'query',
            name: 'limit',
          },
        },
      ],
    },
  ],
};

describe('converter', () => {
  it('OAS2OIS', () => {
    expect(validate('exampleSpecs/OAS.specs.json', 'templates/OAS2OIS.json')).toEqual({
      valid: false,
      messages: [
        formattingMessage('components.securitySchemes.petstore_auth.type'),
        missingParamMessage('components.securitySchemes.petstore_auth.in'),
        extraFieldMessage('components.securitySchemes.petstore_auth.flows'),
      ],
      output: generatedOIS,
    });
  });
});
