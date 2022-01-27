import { ethers } from 'ethers';
import { Config } from '@api3/airnode-operation';

export function buildDeployConfig(config?: Partial<Config>): Config {
  return {
    deployerIndex: 0,
    airnodes: {
      CurrencyConverterAirnode: {
        // We need to create a new mnemonic each time otherwise E2E tests
        // will share the same Airnode wallet
        mnemonic: ethers.Wallet.createRandom().mnemonic.phrase,
        authorizers: [],
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
              { type: 'string32', name: 'to', value: 'USD' },
              { type: 'string32', name: '_type', value: 'uint256' },
              { type: 'string32', name: '_path', value: 'result' },
              { type: 'string32', name: '_times', value: '100000' },
            ],
          },
        },
      },
    },
    authorizers: {},
    requesters: {
      MockRrpRequesterFactory: { sponsors: ['bob'] },
    },
    sponsors: [
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
        sponsorId: 'bob',
        type: 'template',
        airnode: 'CurrencyConverterAirnode',
        template: 'template-1',
        requester: 'MockRrpRequesterFactory',
        fulfillFunctionName: 'fulfill',
        parameters: [{ type: 'string32', name: 'from', value: 'ETH' }],
      },
      {
        sponsorId: 'bob',
        type: 'full',
        airnode: 'CurrencyConverterAirnode',
        endpoint: 'convertToUSD',
        oisTitle: 'Currency Converter API',
        requester: 'MockRrpRequesterFactory',
        fulfillFunctionName: 'fulfill',
        parameters: [
          { type: 'string32', name: 'from', value: 'ETH' },
          { type: 'string32', name: 'to', value: 'USD' },
          { type: 'string32', name: '_type', value: 'int256' },
          { type: 'string32', name: '_path', value: 'result' },
          { type: 'string32', name: '_times', value: '100000' },
        ],
      },
    ],
    ...config,
  };
}
