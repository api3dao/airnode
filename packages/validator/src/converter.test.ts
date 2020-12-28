import { validate } from './validate';

const generatedOIS = {
  title: 'OAS2OIS',
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
    },
  },
};

describe('converter', () => {
  it('OAS2OIS', () => {
    expect(validate('exampleSpecs/OAS.specs.json', 'templates/OAS2OIS.json')).toEqual({
      valid: true,
      messages: [],
      output: generatedOIS,
    });
  });
});
