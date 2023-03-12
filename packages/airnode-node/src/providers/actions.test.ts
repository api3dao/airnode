import { createAndMockGasTarget, mockEthers, mockReadFileSync } from '../../test/mock-utils';

const estimateGasWithdrawalMock = jest.fn();
const failMock = jest.fn();
const fulfillMock = jest.fn();
const fulfillWithdrawalMock = jest.fn();
const staticFulfillMock = jest.fn();
mockEthers({
  airnodeRrpMocks: {
    callStatic: {
      fulfill: staticFulfillMock,
    },
    estimateGas: {
      fulfillWithdrawal: estimateGasWithdrawalMock,
    },
    fail: failMock,
    fulfill: fulfillMock,
    fulfillWithdrawal: fulfillWithdrawalMock,
  },
});

const spawnAwsMock = jest.fn();
jest.mock('../workers/cloud-platforms/aws', () => ({
  spawn: spawnAwsMock,
}));

import * as validator from '@api3/airnode-validator';
import { ethers } from 'ethers';
import range from 'lodash/range';
import * as providers from './actions';
import * as fixtures from '../../test/fixtures';
import { GroupedRequests } from '../types';
import { ChainConfig } from '../config';
import { DEPLOYMENT_ID_LENGTH } from '../workers';

const deploymentIdRegex = RegExp(`local[0-9a-f]{${DEPLOYMENT_ID_LENGTH}}`);

const chainProviderName1 = 'Pocket Ethereum Mainnet';
const chainProviderName3 = 'Infura Sepolia';
const airnodeAddress = '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace';
const chains: ChainConfig[] = [
  {
    authorizers: {
      requesterEndpointAuthorizers: [ethers.constants.AddressZero],
      crossChainRequesterAuthorizers: [],
      requesterAuthorizersWithErc721: [],
      crossChainRequesterAuthorizersWithErc721: [],
    },
    authorizations: {
      requesterEndpointAuthorizations: {},
    },
    maxConcurrency: 100,
    contracts: {
      AirnodeRrp: '0x197F3826040dF832481f835652c290aC7c41f073',
    },
    id: '1',
    providers: {
      [chainProviderName1]: {
        url: 'https://eth-mainnet.gateway.pokt.network/v1/lb/<app_id>',
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
  {
    authorizers: {
      requesterEndpointAuthorizers: [ethers.constants.AddressZero],
      crossChainRequesterAuthorizers: [],
      requesterAuthorizersWithErc721: [],
      crossChainRequesterAuthorizersWithErc721: [],
    },
    authorizations: {
      requesterEndpointAuthorizations: {},
    },
    maxConcurrency: 100,
    contracts: {
      AirnodeRrp: '0x9AF16dE521f41B0e0E70A4f26F9E0C73D757Bd81',
    },
    id: '11155111',
    providers: {
      [chainProviderName3]: {
        url: 'https://sepolia.infura.io/v3/<key>',
      },
    },
    type: 'evm',
    options: {
      fulfillmentGasLimit: 600000,
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
];

describe('initialize', () => {
  fixtures.setEnvVariables({ AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey() });

  it('sets the initial state for each provider', async () => {
    const config = fixtures.buildConfig({ chains });
    mockReadFileSync('config.json', JSON.stringify(config));
    jest.spyOn(validator, 'unsafeParseConfigWithSecrets').mockReturnValue(config);
    const getBlockNumber = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBlockNumber');
    getBlockNumber.mockResolvedValueOnce(123456);
    getBlockNumber.mockResolvedValueOnce(987654);
    const getLogs = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
    getLogs.mockResolvedValueOnce([]);
    getLogs.mockResolvedValueOnce([]);
    const workerOpts = fixtures.buildWorkerOptions();
    const [logs, res] = await providers.initialize('abcdefg', airnodeAddress, config, workerOpts);
    expect(logs).toEqual([]);
    expect(res).toEqual({
      evm: [
        {
          config,
          contracts: {
            AirnodeRrp: '0x197F3826040dF832481f835652c290aC7c41f073',
          },
          settings: {
            airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
            deploymentId: expect.stringMatching(deploymentIdRegex),
            authorizers: {
              requesterEndpointAuthorizers: [ethers.constants.AddressZero],
              crossChainRequesterAuthorizers: [],
              requesterAuthorizersWithErc721: [],
              crossChainRequesterAuthorizersWithErc721: [],
            },
            authorizations: {
              requesterEndpointAuthorizations: {},
            },
            blockHistoryLimit: 300,
            chainId: '1',
            chainType: 'evm',
            chainOptions: {
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
            logFormat: 'plain',
            logLevel: 'DEBUG',
            minConfirmations: 0,
            mayOverrideMinConfirmations: true,
            name: 'Pocket Ethereum Mainnet',
            cloudProvider: {
              type: 'local',
              gatewayServerPort: 3000,
            },
            stage: 'test',
            url: 'https://eth-mainnet.gateway.pokt.network/v1/lb/<app_id>',
            xpub: 'xpub6C8tvRgYkjNVaGMtpyZf4deBcUQHf7vgWUraVxY6gYiZhBYbPkFkLLWJzUUeVFdkKpVtatmXHX8kB76xgfmTpVZWbVWdq1rneaAY6a8RtbY',
          },
          coordinatorId: 'abcdefg',
          currentBlock: 123456,
          gasTarget: null,
          id: expect.anything(),
          masterHDNode: expect.any(ethers.utils.HDNode),
          provider: expect.any(ethers.providers.JsonRpcProvider),
          requests: {
            apiCalls: [],
            withdrawals: [],
          },
          transactionCountsBySponsorAddress: {},
        },
        {
          config,
          contracts: {
            AirnodeRrp: '0x9AF16dE521f41B0e0E70A4f26F9E0C73D757Bd81',
          },
          settings: {
            airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
            deploymentId: expect.stringMatching(deploymentIdRegex),
            authorizers: {
              requesterEndpointAuthorizers: [ethers.constants.AddressZero],
              crossChainRequesterAuthorizers: [],
              requesterAuthorizersWithErc721: [],
              crossChainRequesterAuthorizersWithErc721: [],
            },
            authorizations: {
              requesterEndpointAuthorizations: {},
            },
            blockHistoryLimit: 300,
            chainId: '11155111',
            chainType: 'evm',
            chainOptions: {
              fulfillmentGasLimit: 600000,
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
            logFormat: 'plain',
            logLevel: 'DEBUG',
            minConfirmations: 0,
            mayOverrideMinConfirmations: true,
            name: 'Infura Sepolia',
            cloudProvider: {
              type: 'local',
              gatewayServerPort: 3000,
            },
            stage: 'test',
            url: 'https://sepolia.infura.io/v3/<key>',
            xpub: 'xpub6C8tvRgYkjNVaGMtpyZf4deBcUQHf7vgWUraVxY6gYiZhBYbPkFkLLWJzUUeVFdkKpVtatmXHX8kB76xgfmTpVZWbVWdq1rneaAY6a8RtbY',
          },
          coordinatorId: 'abcdefg',
          currentBlock: 987654,
          gasTarget: null,
          id: expect.anything(),
          masterHDNode: expect.any(ethers.utils.HDNode),
          provider: expect.any(ethers.providers.JsonRpcProvider),
          requests: {
            apiCalls: [],
            withdrawals: [],
          },
          transactionCountsBySponsorAddress: {},
        },
      ],
    });
  });
});

describe('processRequests', () => {
  fixtures.setEnvVariables({ AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey() });

  test.each(['legacy', 'eip1559'] as const)('processes requests for each EVM provider - txType: %s', async (txType) => {
    const { blockWithTransactionsSpy } = createAndMockGasTarget(txType);
    estimateGasWithdrawalMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
    staticFulfillMock.mockResolvedValue({ callSuccess: true });
    fulfillMock.mockResolvedValue({
      hash: '0xad33fe94de7294c6ab461325828276185dff6fed92c54b15ac039c6160d2bac3',
    });

    const sponsorAddress = '0x641eeb15B15d8E2CFB5f9d6480B175d93c14e6B6';
    const apiCall = fixtures.requests.buildSuccessfulApiCall({
      id: '0x67caaa2862cf971502d5c5b3d94d09d15c770f3313e76aa95c296b6587e7e5f1',
      sponsorAddress,
    });
    const requests: GroupedRequests = { apiCalls: [apiCall], withdrawals: [] };

    const transactionCountsBySponsorAddress = { [sponsorAddress]: 5 };
    const allProviders = range(2)
      .map(() => fixtures.buildEVMProviderSponsorState({ requests, transactionCountsBySponsorAddress, sponsorAddress }))
      .map((initialState) => ({
        ...initialState,
        settings: {
          ...initialState.settings,
          chainOptions: {
            ...initialState.settings.chainOptions,
          },
        },
      }));

    const workerOpts = fixtures.buildWorkerOptions();
    const [logs, res] = await providers.processRequests(allProviders, workerOpts);

    expect(logs).toEqual([]);
    expect(blockWithTransactionsSpy).toHaveBeenCalled();
    expect(res.evm.map((evm) => evm.requests.apiCalls[0])).toEqual(
      range(allProviders.length).map(() => ({
        ...apiCall,
        fulfillment: { hash: '0xad33fe94de7294c6ab461325828276185dff6fed92c54b15ac039c6160d2bac3' },
        nonce: 5,
      }))
    );
  });
});
