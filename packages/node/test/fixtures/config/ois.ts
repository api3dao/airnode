import { OIS, ReservedParameterName } from '@api3/ois';

export function buildOIS(ois?: Partial<OIS>): OIS {
  return {
    oisFormat: '1.0.0',
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
          'My Security Scheme': {
            in: 'query',
            type: 'apiKey',
            name: 'access_key',
          },
        },
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
          { name: ReservedParameterName.Type },
          { name: ReservedParameterName.Path },
          {
            name: ReservedParameterName.Times,
            default: '100000',
          },
        ],
        parameters: [
          {
            name: 'from',
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
        testable: true,
      },
    ],
    credentials: {
      securityScheme: 'My Security Scheme',
      value: 'supersecret',
    },
    ...ois,
  };
}
