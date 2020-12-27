import { validate } from './validate';

const generatedOIS = {
  title: 'OAS2OIS',
  version: '1.0.0',
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
  oisFormat: '1.0.0',
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
