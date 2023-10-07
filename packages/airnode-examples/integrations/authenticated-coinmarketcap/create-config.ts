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
      authorizers: {
        requesterEndpointAuthorizers: [],
        crossChainRequesterAuthorizers: [],
        requesterAuthorizersWithErc721: [],
        crossChainRequesterAuthorizersWithErc721: [],
      },
      authorizations: {
        requesterEndpointAuthorizations: {},
      },
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
        fulfillmentGasLimit: 500_000,
        gasPriceOracle: [
          {
            gasPriceStrategy: 'latestBlockPercentileGasPrice',
            percentile: 60,
            minTransactionCount: 20,
            pastToCompareInBlocks: 20,
            maxDeviationMultiplier: 2,
          },
          {
            gasPriceStrategy: 'providerRecommendedGasPrice',
            recommendedGasPriceMultiplier: 1.2,
          },
          {
            gasPriceStrategy: 'constantGasPrice',
            gasPrice: {
              value: 10,
              unit: 'gwei',
            },
          },
        ],
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
    oevGateway: {
      enabled: false,
    },
    logFormat: 'plain',
    logLevel: 'DEBUG',
    nodeVersion: createNodeVersion(),
    stage: 'dev',
  },
  triggers: {
    rrp: [
      {
        endpointId: '0xbe74f8e5e89e096379ffd218a1c357c32fa10da7c131d75c639f99bc8eaeb9c7',
        oisTitle: 'CoinMarketCap Basic Authenticated Request',
        endpointName: 'coinMarketCapData',
        cacheResponses: false,
      },
    ],
    http: [],
    httpSignedData: [],
  },
  templates: [],
  ois: [
    {
      oisFormat: '2.2.1',
      title: 'CoinMarketCap Basic Authenticated Request',
      version: '1.0.0',
      apiSpecifications: {
        servers: [
          {
            url: 'https://pro-api.coinmarketcap.com',
          },
        ],
        paths: {
          '/v1/cryptocurrency/quotes/latest': {
            get: {
              parameters: [
                {
                  in: 'query',
                  name: 'symbol',
                },
                {
                  in: 'query',
                  name: 'skip_invalid',
                },
              ],
            },
          },
        },
        components: {
          securitySchemes: {
            cmcSecurityScheme: {
              in: 'header',
              type: 'apiKey',
              name: 'X-CMC_PRO_API_KEY',
            },
          },
        },
        security: {
          cmcSecurityScheme: [],
        },
      },
      endpoints: [
        {
          name: 'coinMarketCapData',
          operation: {
            method: 'get',
            path: '/v1/cryptocurrency/quotes/latest',
          },
          fixedOperationParameters: [
            {
              operationParameter: {
                in: 'query',
                name: 'skip_invalid',
              },
              value: 'false',
            },
            {
              operationParameter: {
                in: 'query',
                name: 'symbol',
              },
              value: 'ETH',
            },
          ],
          reservedParameters: [
            {
              name: '_type',
              fixed: 'int256',
            },
            {
              name: '_path',
              fixed: 'data.ETH.quote.USD.price',
            },
            {
              name: '_times',
              fixed: '1000000',
            },
          ],
          parameters: [],
        },
      ],
    },
  ],
  apiCredentials: [
    {
      oisTitle: 'CoinMarketCap Basic Authenticated Request',
      securitySchemeName: 'cmcSecurityScheme',
      securitySchemeValue: '${CMC_PRO_API_KEY}',
    },
  ],
});

const generateConfig = async (generateExampleFile = false) => {
  const config = await createConfig(generateExampleFile);
  await generateConfigFile(__dirname, config, generateExampleFile);
};

export default generateConfig;
