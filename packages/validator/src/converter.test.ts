import { validate } from './validate';
import { missingParamMessage } from './utils/messages';

const generatedOIS = {
  title: 'CoinGecko API V3',
  version: '3.0.0',
  oisFormat: '1.0.0',
  apiSpecifications: {
    servers: [
      {
        url: 'https://api.coingecko.com/api/v3',
      },
    ],
    paths: {
      '/ping': {
        get: {
          parameters: [],
        },
      },
      '/simple/price': {
        get: {
          parameters: [
            {
              in: 'query',
              name: 'ids',
            },
            {
              in: 'query',
              name: 'vs_currencies',
            },
            {
              in: 'query',
              name: 'include_market_cap',
            },
            {
              in: 'query',
              name: 'include_24hr_vol',
            },
            {
              in: 'query',
              name: 'include_24hr_change',
            },
            {
              in: 'query',
              name: 'include_last_updated_at',
            },
          ],
        },
      },
      '/simple/token_price/{id}': {
        get: {
          parameters: [
            {
              in: 'path',
              name: 'id',
            },
            {
              in: 'query',
              name: 'contract_addresses',
            },
            {
              in: 'query',
              name: 'vs_currencies',
            },
            {
              in: 'query',
              name: 'include_market_cap',
            },
            {
              in: 'query',
              name: 'include_24hr_vol',
            },
            {
              in: 'query',
              name: 'include_24hr_change',
            },
            {
              in: 'query',
              name: 'include_last_updated_at',
            },
          ],
        },
      },
    },
    components: {
      securitySchemes: {},
      security: {},
    },
  },
  endpoints: [
    {
      name: '/ping',
      operation: {
        method: 'get',
        path: '/ping',
      },
    },
    {
      name: '/simple/price',
      operation: {
        method: 'get',
        path: '/simple/price',
      },
      parameters: [
        {
          name: 'ids',
          operationParameter: {
            name: 'ids',
            in: 'query',
          },
        },
        {
          name: 'vs_currencies',
          operationParameter: {
            name: 'vs_currencies',
            in: 'query',
          },
        },
        {
          name: 'include_market_cap',
          operationParameter: {
            name: 'include_market_cap',
            in: 'query',
          },
        },
        {
          name: 'include_24hr_vol',
          operationParameter: {
            name: 'include_24hr_vol',
            in: 'query',
          },
        },
        {
          name: 'include_24hr_change',
          operationParameter: {
            name: 'include_24hr_change',
            in: 'query',
          },
        },
        {
          name: 'include_last_updated_at',
          operationParameter: {
            name: 'include_last_updated_at',
            in: 'query',
          },
        },
      ],
    },
    {
      name: '/simple/token_price/{id}',
      operation: {
        method: 'get',
        path: '/simple/token_price/{id}',
      },
      parameters: [
        {
          name: 'id',
          operationParameter: {
            name: 'id',
            in: 'path',
          },
        },
        {
          name: 'contract_addresses',
          operationParameter: {
            name: 'contract_addresses',
            in: 'query',
          },
        },
        {
          name: 'vs_currencies',
          operationParameter: {
            name: 'vs_currencies',
            in: 'query',
          },
        },
        {
          name: 'include_market_cap',
          operationParameter: {
            name: 'include_market_cap',
            in: 'query',
          },
        },
        {
          name: 'include_24hr_vol',
          operationParameter: {
            name: 'include_24hr_vol',
            in: 'query',
          },
        },
        {
          name: 'include_24hr_change',
          operationParameter: {
            name: 'include_24hr_change',
            in: 'query',
          },
        },
        {
          name: 'include_last_updated_at',
          operationParameter: {
            name: 'include_last_updated_at',
            in: 'query',
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
      messages: [missingParamMessage('components.securitySchemes')],
      output: generatedOIS,
    });
  });
});
