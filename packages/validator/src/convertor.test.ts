import { convert } from './convertor';
import { formattingMessage, missingParamMessage } from './utils/messages';
import fs from 'fs';

const generatedOIS = JSON.parse(fs.readFileSync('exampleSpecs/OIS2.specs.json').toString());
const generatedCS = {
  config: {
    id: '{FILL}',
    nodeSettings: {
      providerIdShort: '{FILL}',
      nodeVersion: '{FILL}',
      cloudProvider: '{FILL}',
      stage: '{FILL}',
      region: '{FILL}',
      logFormat: '{FILL}',
      chains: [],
      triggers: {
        request: [
          {
            endpointName: '/ping',
            oisTitle: 'CoinGecko API V3',
            endpointId: '{FILL}',
          },
          {
            endpointName: '/simple/price',
            oisTitle: 'CoinGecko API V3',
            endpointId: '{FILL}',
          },
          {
            endpointName: '/simple/token_price/{id}',
            oisTitle: 'CoinGecko API V3',
            endpointId: '{FILL}',
          },
        ],
      },
      ois: [generatedOIS],
    },
  },
  security: {
    id: '{FILL}',
    apiCredentials: {
      'CoinGecko API V3': [
        {
          securitySchemeName: 'api_key',
          value: '{FILL}',
        },
      ],
    },
  },
};

describe('convertor', () => {
  it('OAS2OIS', () => {
    expect(convert('exampleSpecs/OAS.specs.json', 'templates/OAS2OIS.json')).toEqual({
      valid: false,
      messages: [
        formattingMessage(['components', 'securitySchemes', 'petstore_auth', 'type']),
        missingParamMessage(['components', 'securitySchemes', 'petstore_auth', 'in']),
      ],
      output: generatedOIS,
    });
  });

  it('OIS2C&S', () => {
    expect(convert('exampleSpecs/OIS2.specs.json', 'templates/OIS2C&S.json')).toEqual({
      valid: true,
      messages: [],
      output: generatedCS,
    });
  });
});
