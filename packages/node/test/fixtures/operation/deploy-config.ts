import { ethers } from 'ethers';
import { Config } from '@api3/operation';
import { ReservedParameterName } from '@api3/ois';

export function buildDeployConfig(config?: Partial<Config>): Config {
  return {
    deployerIndex: 0,
    airnodes: {
      CurrencyConverterAirnode: {
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
              { type: 'bytes32', name: ReservedParameterName.Type, value: 'uint256' },
              { type: 'bytes32', name: ReservedParameterName.Path, value: 'result' },
              { type: 'bytes32', name: ReservedParameterName.Times, value: '100000' },
              { type: 'bytes32', name: ReservedParameterName.RelayMetadata, value: 'v1' },
            ],
          },
        },
      },
    },
    authorizers: {
      public: '0x0000000000000000000000000000000000000000',
    },
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
        parameters: [{ type: 'bytes32', name: 'from', value: 'ETH' }],
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
          { type: 'bytes32', name: 'from', value: 'ETH' },
          { type: 'bytes32', name: 'to', value: 'USD' },
          { type: 'bytes32', name: ReservedParameterName.Type, value: 'int256' },
          { type: 'bytes32', name: ReservedParameterName.Path, value: 'result' },
          { type: 'bytes32', name: ReservedParameterName.Times, value: '100000' },
          { type: 'bytes32', name: ReservedParameterName.RelayMetadata, value: 'v1' },
        ],
      },
    ],
    ...config,
  };
}
