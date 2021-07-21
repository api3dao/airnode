import fs from 'fs';

import { convert } from './convertor';
import { formattingMessage, missingParamMessage } from './utils/messages';

const generatedOIS = JSON.parse(fs.readFileSync('exampleSpecs/OIS2.specs.json').toString());
const generatedConfig = [
  {
    chains: [],
    environment: {
      chainProviders: [],
      securitySchemes: [
        {
          envName: 'ss_CoinGecko API V3_api_key',
          name: 'api_key',
          oisTitle: 'CoinGecko API V3',
        },
      ],
    },
    id: '{FILL}',
    nodeSettings: {
      cloudProvider: 'aws',
      logFormat: '{FILL}',
      logLevel: '{FILL}',
      nodeVersion: '{FILL}',
      region: '{FILL}',
      stage: '{FILL}',
    },
    ois: [generatedOIS],
    triggers: {
      request: [
        {
          endpointId: '{FILL}',
          endpointName: '/ping',
          oisTitle: 'CoinGecko API V3',
        },
        {
          endpointId: '{FILL}',
          endpointName: '/simple/price',
          oisTitle: 'CoinGecko API V3',
        },
        {
          endpointId: '{FILL}',
          endpointName: '/simple/token_price/{id}',
          oisTitle: 'CoinGecko API V3',
        },
      ],
    },
  },
];

describe('convertor', () => {
  it('OAS2OIS', () => {
    expect(convert('exampleSpecs/OAS.specs.json', 'templates/3.0.0/OAS2OIS.json')).toStrictEqual({
      valid: false,
      messages: [
        formattingMessage(['components', 'securitySchemes', 'petstore_auth', 'type']),
        missingParamMessage(['components', 'securitySchemes', 'petstore_auth', 'in']),
      ],
      output: generatedOIS,
    });
  });

  it('OIS2C&S', () => {
    expect(convert('exampleSpecs/OIS2.specs.json', 'templates/1.0.0/OIS2Config.json')).toStrictEqual({
      valid: true,
      messages: [],
      output: generatedConfig,
    });
  });
});
