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
        endpointId: '0x825a9b8e4e78772cd07cc4307de6737b67cf6d624fff2fa56f71318e479f624b',
        oisTitle: 'Relay Security Schemes via httpbin',
        endpointName: 'httpbinRelaySecuritySchemes',
      },
    ],
    httpSignedData: [],
  },
  templates: [],
  ois: [
    {
      oisFormat: '1.0.0',
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
          },
        },
        security: {
          relayChainId: [],
          relayChainType: [],
          relayRequesterAddress: [],
          relaySponsorAddress: [],
          relaySponsorWalletAddress: [],
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
              fixed: 'address,address,address,uint256,string32',
            },
            {
              name: '_path',
              fixed:
                'headers.Requesteraddress,args.sponsorAddress,args.sponsorWalletAddress,args.chainId,headers.Cookie',
            },
            {
              name: '_times',
              fixed: ',,,,',
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
  generateConfigFile(__dirname, config, generateExampleFile);
};

export default generateConfig;
