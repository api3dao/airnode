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
        endpointId: '0x7ad7519b2b0ebd54c68356a314ffcacd7f897a08523e2ec9e0edd837fe995422',
        oisTitle: 'CoinGecko coins markets request',
        endpointName: 'coinsMarketData',
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
      title: 'CoinGecko coins markets request',
      version: '1.0.0',
      apiSpecifications: {
        servers: [
          {
            url: 'https://api.coingecko.com/api/v3',
          },
        ],
        paths: {
          '/coins/markets': {
            get: {
              parameters: [
                {
                  in: 'query',
                  name: 'vs_currency',
                },
                {
                  in: 'query',
                  name: 'ids',
                },
                {
                  in: 'query',
                  name: 'order',
                },
                {
                  in: 'query',
                  name: 'per_page',
                },
                {
                  in: 'query',
                  name: 'sparkline',
                },
                {
                  in: 'query',
                  name: 'price_change_percentage',
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
          name: 'coinsMarketData',
          operation: {
            method: 'get',
            path: '/coins/markets',
          },
          fixedOperationParameters: [
            {
              operationParameter: {
                in: 'query',
                name: 'order',
              },
              value: 'market_cap_desc',
            },
            {
              operationParameter: {
                in: 'query',
                name: 'per_page',
              },
              value: '10',
            },
            {
              operationParameter: {
                in: 'query',
                name: 'sparkline',
              },
              value: 'false',
            },
            {
              operationParameter: {
                in: 'query',
                name: 'price_change_percentage',
              },
              value: '30d',
            },
          ],
          reservedParameters: [
            {
              name: '_type',
              fixed: 'int256,int256',
            },
            {
              name: '_path',
              fixed: '0,1',
            },
            {
              name: '_times',
              fixed: '',
            },
          ],
          parameters: [
            {
              name: 'coinIds',
              operationParameter: {
                in: 'query',
                name: 'ids',
              },
            },
            {
              name: 'vsCurrency',
              operationParameter: {
                in: 'query',
                name: 'vs_currency',
              },
            },
          ],
          postProcessingSpecifications: [
            {
              environment: 'Node',
              timeoutMs: 5000,
              value: `
                // Log out every coin data
                input.forEach((coinData) => {
                  console.log(\`[Post-processing snippet]: Received the following coin data: \\\${JSON.stringify(coinData, null, 2)}\`)
                })

                const sum = (nums) => nums.reduce((acc, num) => acc + num, 0);
                const average = sum(input.map((coinData) => coinData.current_price)) / input.length;
                const percentageChange = sum(input.map((coinData) => coinData.price_change_percentage_30d_in_currency)) / input.length;

                // Create the data to be sent on chain and multiply it by 10^8 to preserve precision
                const output = [average, percentageChange].map((x) => x * 10 ** 8);
              `,
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
  await generateConfigFile(__dirname, config, generateExampleFile);
};

export default generateConfig;
