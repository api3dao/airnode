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
    logFormat: 'plain',
    logLevel: 'INFO',
    nodeVersion: createNodeVersion(),
    stage: 'dev',
  },
  triggers: {
    rrp: [
      {
        endpointId: '0x642598611f0dcbe389079bf555108513e3e8a15991887bb61126b7200f13c666',
        oisTitle: 'CoinGecko history data request',
        endpointName: 'coinHistoryData',
      },
    ],
    http: [],
    httpSignedData: [],
  },
  templates: [],
  ois: [
    {
      oisFormat: '1.1.1',
      title: 'CoinGecko history data request',
      version: '1.0.0',
      apiSpecifications: {
        servers: [
          {
            url: 'https://api.coingecko.com/api/v3',
          },
        ],
        paths: {
          '/coins/{id}/history': {
            get: {
              parameters: [
                {
                  in: 'path',
                  name: 'id',
                },
                {
                  in: 'query',
                  name: 'date',
                },
                {
                  in: 'query',
                  name: 'localization',
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
          name: 'coinHistoryData',
          operation: {
            method: 'get',
            path: '/coins/{id}/history',
          },
          fixedOperationParameters: [
            {
              operationParameter: {
                in: 'query',
                name: 'localization',
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
            {
              name: 'unixTimestamp',
              operationParameter: {
                in: 'query',
                name: 'date',
              },
            },
          ],
          preProcessingSpecifications: [
            {
              environment: 'Node 14',
              timeoutMs: 5000,
              value: `
                const rawDate = new Date(input.unixTimestamp * 1000);
                const day = rawDate.getDate().toString().padStart(2, '0');
                const month = (rawDate.getMonth() + 1).toString().padStart(2, '0'); // Months start at 0
                const year = rawDate.getFullYear();

                const formattedDate = day + '-' + month + '-' + year;
                const output = {...input, unixTimestamp: formattedDate};

                console.log(\`[Pre-processing snippet]: Formatted \\\${input.unixTimestamp} to \\\${formattedDate}.\`)
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
  generateConfigFile(__dirname, config, generateExampleFile);
};

export default generateConfig;
