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
        endpointId: '0x825a9b8e4e78772cd07cc4307de6737b67cf6d624fff2fa56f71318e479f624b',
        oisTitle: 'Relay Security Schemes via httpbin',
        endpointName: 'httpbinRelaySecuritySchemes',
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
      title: 'Relay Security Schemes via httpbin',
      version: '1.0.0',
      apiSpecifications: {
        servers: [
          {
            url: 'https://httpbin.org',
          },
        ],
        paths: {
          '/get': {
            get: {
              parameters: [],
            },
          },
        },
        components: {
          securitySchemes: {
            relayRequesterAddress: {
              in: 'header',
              type: 'relayRequesterAddress',
              name: 'requesterAddress',
            },
            relaySponsorAddress: {
              in: 'query',
              type: 'relaySponsorAddress',
              name: 'sponsorAddress',
            },
            relaySponsorWalletAddress: {
              in: 'query',
              type: 'relaySponsorWalletAddress',
              name: 'sponsorWalletAddress',
            },
            relayChainId: {
              in: 'query',
              type: 'relayChainId',
              name: 'chainId',
            },
            relayChainType: {
              in: 'cookie',
              type: 'relayChainType',
              name: 'chainType',
            },
            relayRequestId: {
              in: 'query',
              type: 'relayRequestId',
              name: 'requestId',
            },
          },
        },
        security: {
          relayChainId: [],
          relayChainType: [],
          relayRequesterAddress: [],
          relaySponsorAddress: [],
          relaySponsorWalletAddress: [],
          relayRequestId: [],
        },
      },
      endpoints: [
        {
          name: 'httpbinRelaySecuritySchemes',
          operation: {
            method: 'get',
            path: '/get',
          },
          fixedOperationParameters: [],
          reservedParameters: [
            {
              name: '_type',
              fixed: 'address,address,address,uint256,string32,bytes32',
            },
            {
              name: '_path',
              fixed:
                'headers.Requesteraddress,args.sponsorAddress,args.sponsorWalletAddress,args.chainId,headers.Cookie,args.requestId',
            },
            {
              name: '_times',
              fixed: ',,,,,',
            },
          ],
          parameters: [],
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
