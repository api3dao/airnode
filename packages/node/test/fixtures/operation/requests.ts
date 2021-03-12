import { FullRequest, Withdrawal } from '@airnode/operation';

export function buildFullRequest(overrides?: Partial<FullRequest>): FullRequest {
  return {
    requesterId: 'bob',
    type: 'full',
    apiProvider: 'CurrencyConverterAPI',
    endpoint: 'convertToUSD',
    oisTitle: 'currency-converter-ois',
    client: 'MockAirnodeRrpClient',
    fulfillFunctionName: 'fulfill',
    parameters: [
      { type: 'bytes32', name: 'from', value: 'ETH' },
      { type: 'bytes32', name: 'to', value: 'USD' },
      { type: 'bytes32', name: '_type', value: 'int256' },
      { type: 'bytes32', name: '_path', value: 'result' },
      { type: 'bytes32', name: '_times', value: '100000' },
    ],
    ...overrides,
  };
}

export function buildWithdrawal(overrides?: Partial<Withdrawal>): Withdrawal {
  return {
    requesterId: 'alice',
    type: 'withdrawal',
    apiProvider: 'CurrencyConverterAPI',
    destination: 'alice',
    ...overrides,
  };
}
