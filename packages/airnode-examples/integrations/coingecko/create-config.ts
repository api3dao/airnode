import { Config } from '@api3/airnode-node';
import {
  createCloudProviderConfiguration,
  createNodeVersion,
  generateConfigFile,
  getAirnodeRrpAddress,
  getChainId,
} from '../config-utils';

const createConfig = async (generateExampleFile: boolean): Promise<Config> => ({
  chains: [
    {
      maxConcurrency: 100,
      authorizers: [],
      contracts: {
        AirnodeRrp: await getAirnodeRrpAddress(generateExampleFile),
      },
      id: await getChainId(generateExampleFile),
      providers: {
        exampleProvider: {
          url: '${PROVIDER_URL}',
        },
      },
      type: 'evm',
      options: {
        txType: 2,
        baseFeeMultiplier: 2,
        priorityFee: {
          value: 3.12,
          unit: 'gwei',
        },
        fulfillmentGasLimit: 500_000,
      },
    },
  ],
  nodeSettings: {
    cloudProvider: createCloudProviderConfiguration(generateExampleFile),
    airnodeWalletMnemonic: '${AIRNODE_WALLET_MNEMONIC}',
    heartbeat: {
      enabled: false,
    },
    httpGateway: {
      enabled: false,
    },
    httpSignedDataGateway: {
      enabled: false,
    },
    logFormat: 'plain',
    logLevel: 'INFO',
    nodeVersion: createNodeVersion(),
    stage: 'dev',
  },
  triggers: {
    rrp: [
      {
        endpointId: '0xd9e8c9bcc8960df5f954c0817757d2f7f9601bd638ea2f94e890ae5481681153',
        oisTitle: 'CoinGecko basic request',
        endpointName: 'coinMarketData',
      },
    ],
    httpSignedData: [],
  },
  ois: [
    {
      oisFormat: '1.0.0',
      title: 'CoinGecko basic request',
      version: '1.0.0',
      apiSpecifications: {
        servers: [
          {
            url: 'https://api.coingecko.com/api/v3',
          },
        ],
        paths: {
          '/coins/{id}': {
            get: {
              parameters: [
                {
                  in: 'path',
                  name: 'id',
                },
                {
                  in: 'query',
                  name: 'localization',
                },
                {
                  in: 'query',
                  name: 'tickers',
                },
                {
                  in: 'query',
                  name: 'market_data',
                },
                {
                  in: 'query',
                  name: 'community_data',
                },
                {
                  in: 'query',
                  name: 'developer_data',
                },
                {
                  in: 'query',
                  name: 'sparkline',
                },
              ],
            },
          },
        },
        components: {
          securitySchemes: {},
        },
        security: {},
      },
      endpoints: [
        {
          name: 'coinMarketData',
          operation: {
            method: 'get',
            path: '/coins/{id}',
          },
          fixedOperationParameters: [
            {
              operationParameter: {
                in: 'query',
                name: 'localization',
              },
              value: 'false',
            },
            {
              operationParameter: {
                in: 'query',
                name: 'tickers',
              },
              value: 'false',
            },
            {
              operationParameter: {
                in: 'query',
                name: 'market_data',
              },
              value: 'true',
            },
            {
              operationParameter: {
                in: 'query',
                name: 'community_data',
              },
              value: 'false',
            },
            {
              operationParameter: {
                in: 'query',
                name: 'developer_data',
              },
              value: 'false',
            },
            {
              operationParameter: {
                in: 'query',
                name: 'sparkline',
              },
              value: 'false',
            },
          ],
          reservedParameters: [
            {
              name: '_type',
              fixed: 'int256',
            },
            {
              name: '_path',
              fixed: 'market_data.current_price.usd',
            },
            {
              name: '_times',
              fixed: '1000000',
            },
          ],
          parameters: [
            {
              name: 'coinId',
              operationParameter: {
                in: 'path',
                name: 'id',
              },
            },
          ],
        },
      ],
    },
  ],
  apiCredentials: [],
});

const generateConfig = async (generateExampleFile = false) => {
  const config = await createConfig(generateExampleFile);
  generateConfigFile(__dirname, config, generateExampleFile);
};

export default generateConfig;
