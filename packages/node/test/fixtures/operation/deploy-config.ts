import { ethers } from 'ethers';
import { Config } from '@api3/operation';

export function buildDeployConfig(config?: Partial<Config>): Config {
  return {
    deployerIndex: 0,
    airnodes: {
      CurrencyConverterAirnode: {
        airnodeAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
        // We need to create a new mnemonic each time otherwise E2E tests
        // will share the same Airnode wallet
        mnemonic: ethers.Wallet.createRandom().mnemonic.phrase,
        authorizers: ['public'],
        endpoints: {
          convertToUSD: {
            oisTitle: 'Currency Converter API',
          },
        },
        templates: {
          'template-1': {
            endpoint: 'convertToUSD',
            oisTitle: 'Currency Converter API',
            parameters: [
              { type: 'bytes32', name: 'to', value: 'USD' },
              { type: 'bytes32', name: '_type', value: 'uint256' },
              { type: 'bytes32', name: '_path', value: 'result' },
              { type: 'bytes32', name: '_times', value: '100000' },
            ],
          },
        },
      },
    },
    authorizers: {
      public: '0x0000000000000000000000000000000000000000',
    },
    clients: {
      MockAirnodeRrpClientFactory: { endorsers: ['bob'] },
    },
    requesters: [
      {
        id: 'alice',
        airnodes: {
          CurrencyConverterAirnode: { ethBalance: '2' },
        },
      },
      {
        id: 'bob',
        airnodes: {
          CurrencyConverterAirnode: { ethBalance: '5' },
        },
      },
    ],
    requests: [
      {
        requesterId: 'bob',
        type: 'regular',
        airnode: 'CurrencyConverterAirnode',
        template: 'template-1',
        client: 'MockAirnodeRrpClientFactory',
        fulfillFunctionName: 'fulfill',
        parameters: [{ type: 'bytes32', name: 'from', value: 'ETH' }],
      },
      {
        requesterId: 'bob',
        type: 'full',
        airnode: 'CurrencyConverterAirnode',
        endpoint: 'convertToUSD',
        oisTitle: 'Currency Converter API',
        client: 'MockAirnodeRrpClientFactory',
        fulfillFunctionName: 'fulfill',
        parameters: [
          { type: 'bytes32', name: 'from', value: 'ETH' },
          { type: 'bytes32', name: 'to', value: 'USD' },
          { type: 'bytes32', name: '_type', value: 'int256' },
          { type: 'bytes32', name: '_path', value: 'result' },
          { type: 'bytes32', name: '_times', value: '100000' },
        ],
      },
    ],
    ...config,
  };
}
