import { OIS, ReservedParameterName } from '@api3/ois';
import { buildCredentials } from './security';

export function buildOIS(overrides?: Partial<OIS>): OIS {
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
          myapiApiScheme: {
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
          {
            name: ReservedParameterName.Type,
            fixed: 'int256',
          },
          {
            name: ReservedParameterName.Path,
            fixed: 'result',
          },
          {
            name: ReservedParameterName.Times,
            default: '100000',
          },
          {
            name: ReservedParameterName.RelayMetadata,
            default: 'v1',
          },
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
    credentials: buildCredentials(),
    ...overrides,
  };
}
