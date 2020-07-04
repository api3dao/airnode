import { OIS } from '@airnode/node/types';

export const ois: OIS = {
  oisFormat: '1.0.0',
  version: '1.2.3',
  title: 'myapi',
  apiSpecifications: {
    servers: [
      {
        url: 'https://api.myapi.com',
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
    security: {
      myapiApiScheme: [],
    },
  },
  oracleSpecifications: [
    {
      name: 'convertToUsd',
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
          name: 'eType',
          fixed: 'uint256',
        },
        {
          name: 'path',
          fixed: 'result',
        },
        {
          name: 'times',
          default: '100000',
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
};
