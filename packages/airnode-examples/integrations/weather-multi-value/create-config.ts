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
        txType: 'eip1559',
        baseFeeMultiplier: '2',
        priorityFee: {
          value: '3.12',
          unit: 'gwei',
        },
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
    logFormat: 'plain',
    logLevel: 'INFO',
    nodeVersion: createNodeVersion(),
    stage: 'dev',
    skipValidation: true,
  },
  triggers: {
    rrp: [
      {
        endpointId: '0x9f08d41575e84684d7aa111e91597595606212ee3ae200a5f95ad8efc572d72c',
        oisTitle: 'OpenWeather Multiple Encoded Values',
        endpointName: 'histLatLonData',
      },
    ],
  },
  ois: [
    {
      oisFormat: '1.0.0',
      title: 'OpenWeather Multiple Encoded Values',
      version: '1.0.0',
      apiSpecifications: {
        servers: [
          {
            url: 'https://api.openweathermap.org/data/2.5',
          },
        ],
        paths: {
          '/onecall/timemachine': {
            get: {
              parameters: [
                {
                  in: 'query',
                  name: 'lat',
                },
                {
                  in: 'query',
                  name: 'lon',
                },
                {
                  in: 'query',
                  name: 'dt',
                },
              ],
            },
          },
        },
        components: {
          securitySchemes: {
            openWeatherSecurityScheme: {
              in: 'query',
              type: 'apiKey',
              name: 'appid',
            },
          },
        },
        security: {
          openWeatherSecurityScheme: [],
        },
      },
      endpoints: [
        {
          name: 'histLatLonData',
          operation: {
            method: 'get',
            path: '/onecall/timemachine',
          },
          fixedOperationParameters: [],
          reservedParameters: [
            {
              name: '_type',
              fixed: 'uint256,int256,string,timestamp',
            },
            {
              name: '_path',
              fixed: 'current.sunset,current.temp,current.weather.0.main,',
            },
            {
              name: '_times',
              fixed: ',100,,',
            },
          ],
          parameters: [
            {
              name: 'lat',
              required: true,
              operationParameter: {
                in: 'query',
                name: 'lat',
              },
            },
            {
              name: 'lon',
              required: true,
              operationParameter: {
                in: 'query',
                name: 'lon',
              },
            },
            {
              name: 'dt',
              required: true,
              operationParameter: {
                in: 'query',
                name: 'dt',
              },
            },
          ],
        },
      ],
    },
  ],
  apiCredentials: [
    {
      oisTitle: 'OpenWeather Multiple Encoded Values',
      securitySchemeName: 'openWeatherSecurityScheme',
      securitySchemeValue: '${OPENWEATHER_API_KEY}',
    },
  ],
});

const generateConfig = async (generateExampleFile = false) => {
  const config = await createConfig(generateExampleFile);
  generateConfigFile(__dirname, config, generateExampleFile);
};

export default generateConfig;
