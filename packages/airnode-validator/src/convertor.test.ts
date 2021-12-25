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
  it('Converts from OAS to OIS', () => {
    expect(convert('exampleSpecs/OAS.specs.json', 'conversions/oas@3.0------ois@1.0.json')).toEqual({
      valid: false,
      messages: [
        formattingMessage(['components', 'securitySchemes', 'petstore_auth', 'type']),
        missingParamMessage(['components', 'securitySchemes', 'petstore_auth', 'in']),
      ],
      output: generatedOIS,
    });
  });

  it('Converts from OIS to config', () => {
    expect(convert('exampleSpecs/OIS2.specs.json', 'conversions/ois@1.0------config@pre-alpha.json')).toEqual({
      valid: true,
      messages: [],
      output: generatedConfig,
    });
  });
});
