import { OIS } from '@api3/ois';

export function buildOIS(overrides?: Partial<OIS>): OIS {
  return {
    oisFormat: '2.2.1',
    version: '1.2.3',
    title: 'Currency Converter API',
    apiSpecifications: {
      servers: [
        {
          url: 'http://localhost:5000',
        },
      ],
      paths: {
        '/convert': {
          get: {
            parameters: [
              {
                in: 'query',
                name: 'from',
              },
              {
                in: 'query',
                name: 'to',
              },
              {
                in: 'query',
                name: 'amount',
              },
              {
                in: 'query',
                name: 'date',
              },
            ],
          },
        },
      },
      components: {
        securitySchemes: {
          myApiSecurityScheme: {
            in: 'query',
            type: 'apiKey',
            name: 'access_key',
          },
        },
      },
      security: {
        myApiSecurityScheme: [],
      },
    },
    endpoints: [
      {
        name: 'convertToUSD',
        operation: {
          method: 'get',
          path: '/convert',
        },
        fixedOperationParameters: [
          {
            operationParameter: {
              in: 'query',
              name: 'to',
            },
            value: 'USD',
          },
        ],
        reservedParameters: [
          {
            name: '_type',
            fixed: 'int256',
          },
          {
            name: '_path',
            fixed: 'result',
          },
          {
            name: '_times',
            default: '100000',
          },
          { name: '_gasPrice' },
          { name: '_minConfirmations' },
        ],
        parameters: [
          {
            name: 'f',
            default: 'EUR',
            operationParameter: {
              in: 'query',
              name: 'from',
            },
          },
          {
            name: 'amount',
            default: '1',
            operationParameter: {
              name: 'amount',
              in: 'query',
            },
          },
        ],
      },
    ],
    ...overrides,
  };
}
